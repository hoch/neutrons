import {RenderQuantum, FFT} from "../modules/neutrons.js";

registerProcessor("vocoder", class extends AudioWorkletProcessor {
    constructor() {
        super();

        this.fft = new FFT(RenderQuantum);
        this.realInA = new Float32Array(RenderQuantum);
        this.imagInA = new Float32Array(RenderQuantum);
        this.realInB = new Float32Array(RenderQuantum);
        this.imagInB = new Float32Array(RenderQuantum);
        this.realOut = new Float32Array(RenderQuantum);
        this.imagOut = new Float32Array(RenderQuantum);
    }

    process(inputs, outputs) {
        const inp0 = inputs[0];
        const inp1 = inputs[1];
        const output = outputs[0];
        for (let i = 0; i < RenderQuantum; i++) {
            this.realInA[i] = inp0[0][i];
            this.realInB[i] = inp1[0][i];
            this.imagInA[i] = 0.0;
            this.imagInB[i] = 0.0;
        }
        this.fft.process(this.realInA, this.imagInA);
        this.fft.process(this.realInB, this.imagInB);
        for (let i = 0; i < RenderQuantum; i++) {
            const aR = this.realInA[i];
            const aI = this.imagInA[i];
            const bR = this.realInB[i];
            const bI = this.imagInB[i];
            this.realOut[i] = aR * bR - aI * bI;
            this.imagOut[i] = aR * bI + aI * bR;
        }
        this.fft.process(this.imagOut, this.realOut);
        const scale = 1.0 / 512.0;
        for (let i = 0; i < RenderQuantum; i++) {
            output[0][i] = output[1][i] = this.realOut[i] * scale;
        }
        return true;
    }
});