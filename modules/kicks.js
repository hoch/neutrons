import {clamp, Plot, readAudio} from "./standard.js";
import {Exp, Linear, NoFloat, Percent} from "./mapping.js";
import {ExpCurveAlgorithm, ExpCurvePoint, sigmoid} from "./neutrons.js";
import {ArrayPlotter} from "./plotter.js";
import {ParameterBuilder} from "./parameter.js";
import {Click, ClickSetting} from "../worklets/Click.js";
import {ExpCurve} from "../worklets/ExpCurve.js";

export class Kicks {
    constructor() {
        this.canvas = document.createElement("canvas");
        this.canvas.style.width = "100%";
        this.canvas.style.height = "512px";
        this.canvas.style.borderRadius = "2px";
        this.canvas.style.background = "linear-gradient(rgb(30,30,30), rgb(0,0,0), rgb(30,30,30))";
        this.context = this.canvas.getContext("2d");
        this.overtones = new Overtones(this);
        this.duration = 1.0;
        this.timeMapping = new Linear(0.0, this.duration);
        this.amplitude = new Modulation(this.timeMapping, new Linear(0.0, 1.0), Percent, "%");
        this.amplitude.values.push(
            new ExpCurvePoint(0.0, 0.75, 0.99),
            new ExpCurvePoint(1.0, 0.0));
        this.frequency = new Modulation(this.timeMapping, new Exp(30.0, 12000.0), NoFloat, "Hz");
        this.frequency.values.push(
            new ExpCurvePoint(0.0, 192.0, 0.99),
            new ExpCurvePoint(0.050, 60.0, 0.25)
        );
        this.impulse = new Modulation(this.timeMapping, new Linear(0.0, 2.0), Percent, "%");
        this.impulse.values.push(
            new ExpCurvePoint(0.0, 0.0),
            new ExpCurvePoint(1.0, 0.0));
        this.clickSetting = ClickSetting.withCallback(() => this.changed());
        this.sampleRate = Kicks.DEFAULT_RATE;
        this.editModulation = this.frequency;
        this.hasChanges = false;
        this.requestedBuffer = false;
        this.renderPromise = Promise.resolve();
        this.buffer = null;

        this.distortionCurve = new Float32Array(0xFF);
        sigmoid(this.distortionCurve, 0.0);
        this.parameterDistortion = ParameterBuilder.begin("Distortion")
            .valueMapping(new Linear(0.0, 250.0))
            .printMapping(Percent)
            .value(0.0)
            .unit("%")
            .callback(parameter => {
                sigmoid(this.distortionCurve, parameter.value);
                this.changed();
            })
            .create();

        const update = ignore => {
            if (
                this.width !== this.canvas.clientWidth ||
                this.height !== this.canvas.clientHeight ||
                this.devicePixelRatio !== window.devicePixelRatio) {
                this.impulse.plot.width = this.frequency.plot.width = this.amplitude.plot.width = this.width = this.canvas.clientWidth;
                this.impulse.plot.height = this.frequency.plot.height = this.amplitude.plot.height = this.height = this.canvas.clientHeight;
                this.devicePixelRatio = window.devicePixelRatio;
                this.canvas.width = this.canvas.clientWidth * window.devicePixelRatio;
                this.canvas.height = this.canvas.clientHeight * window.devicePixelRatio;
                this.update();
            }
            if (this.hasChanges && !this.requestedBuffer) {
                this.hasChanges = false;
                this.requestedBuffer = true;
                this.renderPromise = this.renderPromise.then(ignore => this.render());
            }
            window.requestAnimationFrame(update);
        };
        window.requestAnimationFrame(update);

        this.initEvents();
        this.changed();
    }

    render() {
        const context = new OfflineAudioContext(1, Math.ceil(this.duration * this.sampleRate), this.sampleRate);
        return Promise.all([
            context.audioWorklet.addModule("./worklets/ClickProcessor.js"),
            context.audioWorklet.addModule("./worklets/ExpCurveProcessor.js")
        ])
            .then(() => {
                const oscillator = context.createOscillator();
                oscillator.setPeriodicWave(this.overtones.createPeriodicWave(context));
                oscillator.frequency.value = 0.0;
                oscillator.start(0.0);
                oscillator.stop(this.duration);
                const frequencyCurve = new ExpCurve(context);
                frequencyCurve.mapping(this.frequency.plot.mapY);
                frequencyCurve.points(this.frequency.values);
                frequencyCurve.connect(oscillator.frequency);
                const envelope = context.createGain();
                envelope.gain.value = 0.0;
                const amplitudeCurve = new ExpCurve(context);
                amplitudeCurve.mapping(this.amplitude.plot.mapY);
                amplitudeCurve.points(this.amplitude.values);
                amplitudeCurve.connect(envelope.gain);
                const waveShaper = context.createWaveShaper();
                waveShaper.curve = this.distortionCurve;
                waveShaper.oversample = "4x";
                const convolver = context.createConvolver();
                convolver.normalize = true;
                const convolverGain = context.createGain();
                convolverGain.gain.value = 0.0;
                oscillator.connect(waveShaper).connect(envelope);
                const impulseCurve = new ExpCurve(context);
                impulseCurve.mapping(this.impulse.plot.mapY);
                impulseCurve.points(this.impulse.values);
                impulseCurve.connect(convolverGain.gain);
                envelope.connect(convolver).connect(convolverGain).connect(context.destination);
                envelope.connect(context.destination);
                const click = new Click(context);
                click.copyFrom(this.clickSetting);
                click.connect(convolver);
                click.connect(context.destination);
                return readAudio(context, "files/impulse/spaces/St Nicolaes Church.ogg")
                    .then(impulse => {
                        convolver.buffer = impulse;
                        return new Promise((resolve, ignore) => {
                            setTimeout(() => {
                                context.startRendering()
                                    .then(buffer => {
                                        this.buffer = buffer;
                                        this.requestedBuffer = false;
                                        this.update();
                                        resolve(buffer);
                                    });
                            }, 50);
                        });
                    });
            });
    }

    get domElement() {
        return this.canvas;
    }

    changed() {
        this.update();
        this.hasChanges = true;
    }

    initEvents() {
        const canvas = this.canvas;
        let lastMouseDown = 0.0;
        canvas.addEventListener("mousedown", event => {
            const plot = this.editModulation.plot;
            const values = this.editModulation.values;
            if (event.target === event.currentTarget) {
                const clientRect = canvas.getBoundingClientRect();
                const beginMouseX = event.clientX - clientRect.x;
                const beginMouseY = event.clientY - clientRect.y;
                let target = null;
                let index = -1;
                let minimum = 49.0; // 7^2
                for (let i = 0; i < values.length; i++) {
                    const v = values[i];
                    const dx = plot.valueToX(v.time) - beginMouseX;
                    const dy = plot.valueToY(v.value) - beginMouseY;
                    const dd = dx * dx + dy * dy;
                    if (minimum > dd) {
                        target = v;
                        index = i;
                        minimum = dd;
                    }
                }
                const now = performance.now();
                const doubleClick = now - lastMouseDown < 240;
                lastMouseDown = now;
                if (doubleClick) {
                    if (null === target) {
                        target = new ExpCurvePoint(plot.xToValue(beginMouseX), plot.yToValue(beginMouseY), 0.5);
                        values.push(target);
                        values.sort((a, b) => a.time > b.time ? 1 : a.time < b.time ? -1 : 0);
                        this.changed();
                    } else if (0 !== index) {
                        values.splice(index, 1);
                        this.changed();
                        return;
                    }
                }
                let onWindowMouseMove = null;
                if (null === target) {
                    const time = plot.xToValue(beginMouseX);
                    for (let i = 1; i < values.length; i++) {
                        if (values[i].time > time) {
                            target = values[i - 1];
                            const beginSlope = target.slope;
                            const sign = target.value > values[i].value ? 1.0 : -1.0;
                            onWindowMouseMove = event => {
                                const deltaMouseY = (event.clientY - clientRect.y) - beginMouseY;
                                target.slope = clamp(0.01, 0.99, beginSlope + deltaMouseY * sign * 0.01);
                                this.changed();
                            };
                            break;
                        }
                    }
                } else {
                    onWindowMouseMove = event => {
                        const deltaMouseX = (event.clientX - clientRect.x) - beginMouseX;
                        const deltaMouseY = (event.clientY - clientRect.y) - beginMouseY;
                        if (0 !== index) {
                            target.time = plot.xToValue(plot.clampX(beginMouseX + deltaMouseX));
                        }
                        if (!event.shiftKey) {
                            target.value = plot.yToValue(plot.clampY(beginMouseY + deltaMouseY));
                        }
                        this.changed();
                    };
                }
                if (null !== onWindowMouseMove) {
                    const onWindowMouseUp = ignore => {
                        target = null;
                        window.removeEventListener("mousemove", onWindowMouseMove);
                        window.removeEventListener("mouseup", onWindowMouseUp);
                    };
                    window.addEventListener("mousemove", onWindowMouseMove);
                    window.addEventListener("mouseup", onWindowMouseUp);
                }
            }
        });
    }

    update() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const context = this.context;
        const pixelRatio = window.devicePixelRatio;
        const center = height / (2 * pixelRatio);
        context.clearRect(0.0, 0.0, width, height);
        context.save();
        context.scale(pixelRatio, pixelRatio);
        if (null !== this.buffer) {
            context.beginPath();
            context.strokeStyle = context.strokeStyle = "rgba(255,255,255,0.5)";
            context.setLineDash([1, 2]);
            context.moveTo(Modulation.PADDING[3], center);
            context.lineTo(width / pixelRatio - Modulation.PADDING[1], center);
            context.stroke();
            context.setLineDash([]);
            context.fillStyle = context.strokeStyle = "rgba(255,255,255,0.3)";
            ArrayPlotter.render(context, this.buffer.getChannelData(0),
                Modulation.PADDING[3], width / pixelRatio - Modulation.PADDING[1],
                0, height / pixelRatio, 0, this.buffer.length, -1.0, 1.0);
        }
        this.editModulation.render(context);
        context.restore();
    }

    switchView(value) {
        switch (value) {
            case "pitch": {
                this.editModulation = this.frequency;
                this.update();
                break;
            }
            case "amplitude": {
                this.editModulation = this.amplitude;
                this.update();
                break;
            }
            case "impulse": {
                this.editModulation = this.impulse;
                this.update();
                break;
            }
        }
    }
}

Kicks.CURVE = new ExpCurveAlgorithm();
Kicks.DEFAULT_RATE = 48000.0;

class Overtones {
    constructor(kicks) {
        this.kicks = kicks;

        this.canvas = document.createElement("canvas");
        this.canvas.style.width = "255px";
        this.canvas.style.height = "100%";
        this.context = this.canvas.getContext("2d");
        this.values = new Float32Array(16);
        this.values[0] = 1.0;
        this.initEvents();
        const update = ignore => {
            if (
                this.width !== this.canvas.clientWidth ||
                this.height !== this.canvas.clientHeight ||
                this.devicePixelRatio !== window.devicePixelRatio) {
                this.width = this.canvas.clientWidth;
                this.height = this.canvas.clientHeight;
                this.devicePixelRatio = window.devicePixelRatio;
                this.canvas.width = this.width * window.devicePixelRatio;
                this.canvas.height = this.height * window.devicePixelRatio;
                this.update();
            }
            window.requestAnimationFrame(update);
        };
        window.requestAnimationFrame(update);
    }

    createPeriodicWave(context) {
        const brightness = 1.0 / 16.0;
        for (let i = 0; i < Overtones.NUMBER; i++) {
            const x = i / Overtones.NUMBER;
            const y = 1.0 - Math.pow(x, brightness);
            Overtones.IMAG[i + 1] = this.values[i] * y;
        }
        return context.createPeriodicWave(Overtones.REAL, Overtones.IMAG);
    }

    get domElement() {
        return this.canvas;
    }

    initEvents() {
        const canvas = this.canvas;
        const modify = event => {
            const clientRect = canvas.getBoundingClientRect();
            const index = Math.floor((event.clientX - clientRect.x) / Overtones.WIDTH);
            const value = 1.0 - (event.clientY - clientRect.y) / canvas.height;
            if (0 <= index && index < Overtones.NUMBER) {
                this.values[index] = clamp(0.0, 1.0, value);
                this.kicks.changed();
                this.update();
            }
        };
        canvas.addEventListener("mousedown", event => {
            modify(event);
            const onWindowMouseUp = ignore => {
                window.removeEventListener("mousemove", modify);
                window.removeEventListener("mouseup", onWindowMouseUp);
            };
            window.addEventListener("mousemove", modify);
            window.addEventListener("mouseup", onWindowMouseUp);
        });
    }

    update() {
        const canvas = this.canvas;
        const context = this.context;
        const width = canvas.width;
        const height = canvas.height;
        const values = this.values;
        const pixelRatio = window.devicePixelRatio;
        context.clearRect(0, 0, width, height);
        context.save();
        context.scale(pixelRatio, pixelRatio);
        context.fillStyle = "rgb(30,30,30)";
        for (let i = 0; i < Overtones.NUMBER; i++) {
            const x = i * Overtones.WIDTH;
            context.fillRect(x, 0, Overtones.WIDTH - 1, height);
        }
        context.fillStyle = "rgb(50,50,50)";
        for (let i = 0; i < Overtones.NUMBER; i++) {
            const x = i * Overtones.WIDTH;
            const h = values[i] * height;
            context.fillRect(x, height - h, Overtones.WIDTH - 1, h);
        }
        context.restore();
    }
}

Overtones.NUMBER = 16;
Overtones.WIDTH = 16;
Overtones.REAL = new Float32Array(Overtones.NUMBER + 1);
Overtones.IMAG = new Float32Array(Overtones.NUMBER + 1);

class Modulation {
    constructor(timeMapping, valueMapping, printMapping, unit) {
        this.plot = new Plot(800, 400, Modulation.PADDING, timeMapping, valueMapping);
        this.valueMapping = valueMapping;
        this.printMapping = printMapping;
        this.unit = unit;
        this.values = [];
    }

    render(context) {
        const plot = this.plot;
        const values = this.values;
        const curve = Kicks.CURVE;
        context.font = "10px Open Sans";
        context.textBaseline = "top";
        context.strokeStyle = "#28E5FF";
        context.beginPath();
        let prev = values[0];
        context.moveTo(plot.valueToX(prev.time), plot.valueToY(prev.value));
        for (let i = 1; i < values.length; i++) {
            const next = values[i];
            const prevX = plot.valueToX(prev.time);
            const nextX = plot.valueToX(next.time);
            const xp = prevX | 0;
            const xn = nextX | 0;
            if (xn > xp) {
                curve.byBend(nextX - prevX, plot.valueToY(prev.value), prev.slope, plot.valueToY(next.value));
                const d = curve.delta;
                const m = curve.multiplier;
                for (let x = xp, y = plot.valueToY(prev.value); x < xn; x++) {
                    context.lineTo(x, y);
                    y = y * m + d;
                }
            }
            prev = next;
        }
        const xn = plot.valueToX(prev.time);
        context.lineTo(xn, plot.valueToY(prev.value));
        const xMax = plot.width - Modulation.PADDING[1];
        if (xn < xMax) {
            context.lineTo(xMax, plot.valueToY(prev.value));
        }
        context.stroke();
        context.fillStyle = "white";
        context.strokeStyle = "rgba(255,255,255,0.3)";
        for (let i = 0; i < values.length; i++) {
            const v = values[i];
            const x = plot.valueToX(v.time);
            const y = plot.valueToY(v.value);
            context.beginPath();
            context.arc(x, y, 6.0, 0.0, 2.0 * Math.PI, false);
            context.stroke();
            context.beginPath();
            context.arc(x, y, 2.0, 0.0, 2.0 * Math.PI, false);
            context.fill();
            context.fillText(this.printMapping.output(this.valueMapping, this.valueMapping.x(v.value)) + this.unit, x + 16, y);
        }
    }
}

Modulation.PADDING = new Float64Array([16, 32, 16, 16]);