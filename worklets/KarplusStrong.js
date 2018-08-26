import {monotoneRandom} from "../modules/standard.js";
import {noiseGen} from "../workers/noise.js";

export class KarplusStrong extends AudioWorkletNode {
    constructor(context, onComplete) {
        super(context, "karplus-strong", {
            numberOfInputs: 0,
            numberOfOutputs: 1,
            outputChannelCount: [2],
            channelCount: 2,
            channelCountMode: "explicit",
            channelInterpretation: "speakers"
        });

        const agressive = x => {
            const xx = x - 1.0 / 128.0;
            return Math.exp(-64.0 * xx * xx);
        };
        const brighter = x => {
            const xx = x - 1.0 / 4.0;
            return Math.exp(-xx * xx);
        };
        const color = x => Math.pow(x, -0.25);
        noiseGen(0x64A321, color).then(samples => this.port.postMessage({
            action: "noise",
            args: samples
        }));

        this.port.onmessage = event => {
            if( onComplete && event.data === "ready") {
                onComplete(this);
            }
        };

        this.spreading = new Float32Array(6);
        monotoneRandom(this.spreading, 0);
    }

    play(time, index, offset) {
        this.port.postMessage({action: "play", args: {time: time, index: index, offset: offset}});
    }

    playTab(time, chord, down, spread, tap) {
        for (let i = 0, j = 0; i < 6; i++) {
            const index = down ? i : 5 - i;
            const offset = chord[index];
            if (-1 !== offset) {
                this.play(time + this.spreading[j++] * spread, index, offset);
            }
        }
        if (0.0 < tap) {
            this.damp(tap);
        }
    }

    damp(time) {
        this.port.postMessage({action: "damp", args: {time: time}});
    }

    body(value) {
        this.port.postMessage({action: "body", args: value});
    }
}