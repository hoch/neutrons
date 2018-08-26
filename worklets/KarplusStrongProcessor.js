import {EventReceiver, midiToFrequency, RenderQuantum, RMS} from "../modules/neutrons.js";

class Event {
    constructor(time) {
        this.time = time;
    }
}

class PlayEvent extends Event {
    constructor(time, index, offset) {
        super(time);

        this.index = index;
        this.offset = offset;
    }
}

class DampEvent extends Event {
    constructor(time) {
        super(time);
    }
}

class KSString {
    static create(sampleRate) {
        const strings = [];
        for (let i = 0; i < KSString.NOTES.length; i++) {
            strings[i] = new KSString(KSString.NOTES[i], sampleRate);
        }
        return strings;
    }

    constructor(note, sampleRate) {
        this.note = note;
        this.sampleRate = sampleRate;
        this.frequency = midiToFrequency(note, 440.0);
        this.length = this.maxLength = Math.ceil(this.sampleRate / this.frequency);
        this.line = new Float32Array(this.maxLength);
        this.lastValue = 0.0;
        this.index = 0;
        this.phase = 0.0;
        this.rms = new RMS((sampleRate * 0.03) | 0);
        this.stroking = true;
        this.bodyEnabled = false;
    }

    play(noise, offset) {
        if (0 > offset) {
            return;
        }
        this.fillNoise(noise, 1.0);
        this.frequency = midiToFrequency(this.note + offset, 440.0);
        this.length = Math.ceil(this.sampleRate / this.frequency);
        this.lastValue = 0.0;
        this.stroking = true;
    }

    close(noise) {
        this.fillNoise(noise, 2.0);
        this.stroking = false;
    }

    fillNoise(noise, gain) {
        const noiseOffset = Math.floor(Math.random() * noise.length);
        const length = this.length;
        for (let i = 0; i < length; i++) {
            this.line[(this.index + i) % length] += noise[(noiseOffset + i) % noise.length] * gain;
        }
    }

    body(value) {
        this.bodyEnabled = value;
    }

    process(outputs, fromIndex, toIndex) {
        const ch0 = outputs[0];
        const ch1 = outputs[1];
        // TODO Include sampleRate (http://www.earlevel.com/main/2012/12/15/a-one-pole-filter/)
        const coeff = this.stroking ? 0.4986 : 0.4;
        const phaseShift = (this.length / 2) | 0;
        for (let i = fromIndex; i < toIndex; i++) {
            const read = this.line[this.index];
            this.line[this.index] = (read + this.lastValue) * coeff;
            this.lastValue = read;

            // sine support
            const energy = this.rms.pushPop(read * read);
            if (this.bodyEnabled) {
                const sin = Math.sin(this.phase * 2.0 * Math.PI) * energy * energy * 1.8;
                ch0[i] += sin;
                ch1[i] += sin;
                this.phase += this.frequency / this.sampleRate;
            }

            ch0[i] += this.line[this.index] * 0.2;
            ch1[i] += this.line[(this.index + phaseShift) % this.length] * 0.17;
            if (++this.index >= this.length) {
                this.index -= this.length;
            }
        }
    }
}

KSString.NOTES = new Int32Array([40, 45, 50, 55, 59, 64]);

registerProcessor("karplus-strong", class extends AudioWorkletProcessor {
    constructor(options) {
        super(options);

        this.noise = null;
        this.strings = KSString.create(sampleRate);
        this.receiver = new EventReceiver(
            (event) => {
                if (null === this.noise) {
                    return;
                }
                if (event instanceof PlayEvent) {
                    this.strings[event.index].play(this.noise, event.offset);
                } else if (event instanceof DampEvent) {
                    for (let index = 0; index < this.strings.length; index++) {
                        this.strings[index].close(this.noise);
                    }
                }
            },
            (inputs, outputs, from, to) => {
                const output = outputs[0];
                for (let i = 0; i < this.strings.length; i++) {
                    this.strings[i].process(output, from, to);
                }
            });
        this.port.onmessage = event => {
            const data = event.data;
            const args = data.args;
            switch (data.action) {
                case "noise": {
                    this.noise = args;
                    this.port.postMessage("ready");
                    break;
                }
                case "play": {
                    this.receiver.enqueue(new PlayEvent(args.time, args.index, args.offset));
                    break;
                }
                case "damp": {
                    this.receiver.enqueue(new DampEvent(args.time));
                    break;
                }
                case "body": {
                    for (let string of this.strings) {
                        string.body(args);
                    }
                    break;
                }
            }
        };
    }

    process(inputs, outputs) {
        this.receiver.fragment(inputs, outputs, currentTime);
        return true;
    }
});