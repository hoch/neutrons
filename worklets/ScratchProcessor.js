import {RenderQuantum, EventReceiver, barsToSeconds} from "../modules/neutrons.js";
import {ScratchPattern} from "../modules/scratching.js";

class PlayEvent {
    constructor(time, pattern) {
        this.time = time;
        this.pattern = pattern;
    }
}

registerProcessor("Scratch", class extends AudioWorkletProcessor {
    constructor() {
        super();

        const fps = 60.0;
        this.updateRate = (sampleRate / fps) | 0;
        this.updateCount = 0 | 0;

        this.playPattern = null;
        this.buffer = null;
        this.loop = null;
        this.from = 0.0;
        this.to = 1.0;

        this.coeff = Math.exp(-1.0 / (0.001 * sampleRate));
        this.gain = 0.0;

        this.pattern = null;
        this.receiver = new EventReceiver(
            (event) => {
                this.time = 0.0;
                this.pattern = event.pattern;
                this.pattern.restart();
            }, (inputs, outputs, from, to) => {
                const output = outputs[0];
                if (null === this.pattern) {
                    return true;
                }
                const buffer = this.buffer;
                const bufCh0 = buffer.channels[0];
                const bufCh1 = buffer.channels[1];
                const outCh0 = output[0];
                const outCh1 = output[1];
                const scratchesDuration = this.pattern.scratchesDuration;
                for (let i = from; i < to; i++) {
                    const fade = this.pattern.getFade(this.time);
                    const position = this.pattern.getPos(this.time) * 0.5; // 0.5 TODO make pattern property
                    const local = this.from + position * (this.to - this.from);
                    const sf = local * (this.buffer.length - 1);
                    const si = sf | 0;
                    const sa = sf - si;
                    this.gain = fade + this.coeff * (this.gain - fade);
                    outCh0[i] = (bufCh0[si] + sa * (bufCh0[si + 1] - bufCh0[si])) * this.gain * 0.5;
                    outCh1[i] = (bufCh1[si] + sa * (bufCh1[si + 1] - bufCh1[si])) * this.gain * 0.5;
                    this.time += this.velocity;
                    if (this.time >= scratchesDuration) {
                        this.pattern = null;
                        return true;
                    }
                }
                this.updateCount += to - from;
                if (this.updateCount >= this.updateRate) {
                    this.updateCount -= this.updateRate;
                    this.port.postMessage(this.time);
                }
            });

        this.port.onmessage = event => {
            const data = event.data;
            const action = data.action;
            switch (action) {
                case "set-sample": {
                    const value = data.value;
                    this.from = value.from;
                    this.to = value.to;
                    this.buffer = value.buffer;
                    break;
                }
                case "set-bpm": {
                    this.velocity = 1.0 / (sampleRate * barsToSeconds(2.0, data.value));
                    break;
                }
                case "play-pattern": {
                    const value = data.value;
                    this.receiver.enqueue(new PlayEvent(value.time, ScratchPattern.deserialise(value.pattern)));
                    break;
                }
            }
        };

        this.time = 0.0;
    }

    process(inputs, outputs) {
        this.receiver.fragment(inputs, outputs, currentTime);
        return true;
    }
});