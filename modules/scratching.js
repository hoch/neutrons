const DEFAULT_DISTANCE = 0.25;

export class Scratches {
    static baby(distance) {
        distance = distance || DEFAULT_DISTANCE;
        return x => (1.0 - Math.cos(x * 2.0 * Math.PI)) * 0.5 * distance;
    }

    static linear(distance) {
        distance = distance || DEFAULT_DISTANCE;
        return x => x * distance;
    }

    static tearIn(order, distance) {
        const baby = Scratches.baby(distance || DEFAULT_DISTANCE);
        const phase = Curves.tear(order);
        return x => 0.5 < x ? baby(x) : baby(phase(2.0 * x) * 0.5);
    }

    static tearOut(order, distance) {
        const baby = Scratches.baby(distance || DEFAULT_DISTANCE);
        const phase = Curves.tear(order);
        return x => 0.5 > x ? baby(x) : baby(phase(2.0 * x - 1.0) * 0.5 + 0.5);
    }

    static tearInOut(order, distance) {
        const baby = Scratches.baby(distance || DEFAULT_DISTANCE);
        const phase = Curves.tear(order);
        return x => 0.5 < x ? baby(phase(2.0 * x - 1.0) * 0.5 + 0.5) : baby(phase(2.0 * x) * 0.5);
    }
}

export class Curves {
    static tear(order) {
        if (1 > order || !Number.isInteger(order)) {
            throw new Error("order(" + order + ") must be positive and integer");
        }
        if (1 === (order & 1)) {
            return x => 0.5 + (1 << (order - 1)) * Math.pow(x - 0.5, order);
        } else {
            return x => x > 0.5
                ? 0.5 + (1 << (order - 1)) * Math.pow(x - 0.5, order)
                : 0.5 - (1 << (order - 1)) * Math.pow(x - 0.5, order);
        }
    }
}

export class Scratch {
    constructor(duration, factory, args) {
        this.duration = duration;
        this.factory = factory;
        this.args = args;
    }

    resolve() {
        return this.factory.apply(null, this.args);
    }
}

export class FadePoint {
    constructor(duration, gate) {
        this.duration = duration;
        this.gate = gate;
    }
}

export class ScratchPattern {
    constructor() {
        this.fades = [];
        this.fadeIndex = 0;
        this.fadeFrom = NaN;
        this.fadeTo = NaN;
        this.fade = null;
        this.fadesDuration = 0.0;

        this.scratches = [];
        this.scratchIndex = 0;
        this.scratchFrom = NaN;
        this.scratchTo = NaN;
        this.scratch = null;
        this.scratchMethod = null;
        this.scratchesDuration = 0.0;

        this.time = NaN;
        this.running = false;
    }

    appendScratch(duration, factory, args) {
        const optional = Array.isArray(args) ? args : Array.prototype.slice.call(arguments, 2);
        this.scratches.push(new Scratch(duration, factory, optional));
        this.scratchesDuration += duration;
        return this;
    }

    appendFadePoint(duration, gate) {
        this.fades.push(new FadePoint(duration, gate));
        this.fadesDuration += duration;
        return this;
    }

    restart() {
        if (0 < this.scratches.length) {
            this.scratchIndex = 0;
            this.scratch = this.scratches[0];
            this.scratchMethod = this.scratch.resolve();
            this.scratchFrom = 0.0;
            this.scratchTo = this.scratch.duration;

            this.fadeIndex = 0;
            this.fade = 0 < this.fades.length ? this.fades[0] : null;
            this.fadeFrom = 0.0;
            this.fadeTo = null === this.fade ? Number.POSITIVE_INFINITY : this.fade.duration;

            this.running = true;
        } else {
            this.running = false;
        }
    }

    getFade(time) {
        if (!this.running) {
            return 0.0;
        }
        const value = null === this.fade ? 1.0 : this.fade.gate;
        while (time >= this.fadeTo) {
            if (!this.nextFade()) {
                return 0.0;
            }
        }
        return value;
    }

    getPos(time) {
        if (!this.running) {
            return 0.0;
        }
        const value = this.scratchMethod((time - this.scratchFrom) / (this.scratchTo - this.scratchFrom));
        while (time >= this.scratchTo) {
            if (!this.nextScratch()) {
                return 0.0;
            }
        }
        return value;
    }

    nextFade() {
        if (++this.fadeIndex >= this.fades.length) {
            return this.running = false;
        }
        this.fade = this.fades[this.fadeIndex];
        this.fadeFrom = this.fadeTo;
        this.fadeTo = this.fadeFrom + this.fade.duration;
        return true;
    }

    nextScratch() {
        if (++this.scratchIndex >= this.scratches.length) {
            return this.running = false;
        }
        this.scratch = this.scratches[this.scratchIndex];
        this.scratchMethod = this.scratch.resolve();
        this.scratchFrom = this.scratchTo;
        this.scratchTo = this.scratchFrom + this.scratch.duration;
        return true;
    }

    serialise() {
        const o = {
            fades: this.fades,
            scratches: []
        };
        const scratches = this.scratches;
        for (let i = 0; i < scratches.length; i++) {
            const scratch = scratches[i];
            if (Scratches[scratch.factory.name] === undefined) {
                throw new Error("Not a member of class Scratches");
            }
            o.scratches[i] = {
                duration: scratch.duration,
                factory: scratch.factory.name,
                args: scratch.args
            };
        }
        return o;
    }

    static deserialise(o) {
        const scratches = o.scratches;
        const fades = o.fades;
        const pattern = new ScratchPattern();
        for (let i = 0; i < scratches.length; i++) {
            const scratch = scratches[i];
            pattern.appendScratch(scratch.duration, Scratches[scratch.factory], scratch.args);
        }
        for (let i = 0; i < fades.length; i++) {
            const fade = fades[i];
            pattern.appendFadePoint(fade.duration, fade.gate);
        }
        return pattern;
    }
}


const d1d4 = 1.0 / 4.0;
const d1d8 = 1.0 / 8.0;
const d3d8 = 3.0 / 8.0;
const d1d16 = 1.0 / 16.0;
const d3d16 = 3.0 / 16.0;
const d1d32 = 1.0 / 32.0;

// http://dj.wikia.com/wiki/Scratching
//
ScratchPattern.BabyExample = new ScratchPattern()
    .appendScratch(d1d4, Scratches.baby, 1.0)
    .appendScratch(d1d4, Scratches.baby, 1.0)
    .appendScratch(d1d8, Scratches.baby, 1.0)
    .appendScratch(d3d8, Scratches.baby, 1.0)
;

ScratchPattern.TwiddleExample = new ScratchPattern()
    .appendScratch(d1d4, Scratches.baby, 1.0)
    .appendScratch(d1d4, Scratches.baby, 1.0)
    .appendScratch(d1d8, Scratches.baby, 1.0)
    .appendScratch(d3d8, Scratches.baby, 1.0)

    .appendFadePoint(d1d16, 0)
    .appendFadePoint(d1d16, 1)
    .appendFadePoint(d1d32, 0)
    .appendFadePoint(d1d32, 1)
    .appendFadePoint(d1d32, 0)
    .appendFadePoint(d1d32, 1)
    .appendFadePoint(d1d32, 0)
    .appendFadePoint(d1d32, 1)
    .appendFadePoint(d1d32, 0)
    .appendFadePoint(d1d32, 1)
    .appendFadePoint(d1d16, 0)
    .appendFadePoint(d1d32, 1)
    .appendFadePoint(d1d32, 0)

    .appendFadePoint(d1d16, 1)
    .appendFadePoint(d1d16, 0)
    .appendFadePoint(d1d32, 1)
    .appendFadePoint(d1d32, 0)
    .appendFadePoint(d1d32, 1)
    .appendFadePoint(d1d32, 0)
    .appendFadePoint(d1d32, 1)
    .appendFadePoint(d1d32, 0)
    .appendFadePoint(d1d32, 1)
    .appendFadePoint(d1d32, 0)
    .appendFadePoint(d1d32, 1)
    .appendFadePoint(d1d32, 0)
    .appendFadePoint(d1d16, 1)
;

ScratchPattern.TearExample = new ScratchPattern()
    .appendScratch(d1d4, Scratches.tearOut, 2, 1.0)
    .appendScratch(d1d4, Scratches.tearIn, 2, 1.0)
    .appendScratch(d1d8, Scratches.tearIn, 2, 1.0)
    .appendScratch(d3d8, Scratches.tearInOut, 2, 1.0)
    /*.appendFadePoint(d1d16, 1)
    .appendFadePoint(d1d16, 0)
    .appendFadePoint(d1d16, 1)
    .appendFadePoint(d1d16, 0)
    .appendFadePoint(d1d16, 1)
    .appendFadePoint(d1d16, 0)
    .appendFadePoint(d1d16, 1)
    .appendFadePoint(d1d16, 0)
    .appendFadePoint(d1d16, 1)
    .appendFadePoint(d1d16, 0)
    .appendFadePoint(d1d16, 1)
    .appendFadePoint(d1d16, 0)
    .appendFadePoint(d1d16, 1)
    .appendFadePoint(d1d16, 0)
    .appendFadePoint(d1d16, 1)
    .appendFadePoint(d1d16, 0)*/
;

ScratchPattern.ReleaseExample = new ScratchPattern()
    .appendScratch(0.5, Scratches.baby)
    .appendScratch(0.5, Scratches.linear, 1.0)
;