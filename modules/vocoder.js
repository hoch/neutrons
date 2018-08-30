import {Analyser} from "./analyser.js";
import {EnvelopeFollower} from "../worklets/EnvelopeFollower.js";
import {Linear, Exp} from "./mapping.js";
import {gainToDb} from "./neutrons.js";
import {hsla} from "./standard.js";

const createFilter = (context, frequency, Q) => {
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = Q;
    return filter;
};

class VocoderBand {
    constructor(context, carrier, modulator, output, cFreq, mFreq, Q, gain) {
        this.envelopeFollower = new EnvelopeFollower(context);
        this.levelNode = context.createGain();
        this.levelNode.gain.value = 0.0;
        this.gainNode = context.createGain();
        this.gainNode.gain.value = gain;
        this.modulatorFilter = createFilter(context, mFreq, Q);
        this.carrierFilter = createFilter(context, cFreq, Q);
        modulator
            .connect(this.modulatorFilter)
            .connect(this.envelopeFollower)
            .connect(this.levelNode.gain);

        carrier
            .connect(this.carrierFilter)
            .connect(this.levelNode)
            .connect(this.gainNode)
            .connect(output);
    }
}

export class Vocoder {
    static request(context, numBands) {
        return context.audioWorklet.addModule("worklets/EnvelopeFollowerProcessor.js")
            .then(() => new Vocoder(context, numBands || 10));
    }

    constructor(context, numBands) {
        this.context = context;
        this.numBands = numBands;

        this.carrier = context.createGain();
        this.modulator = context.createGain();
        this.output = context.createGain();

        this.carrierFrequencies = new Float32Array(numBands);
        this.modulatorFrequencies = new Float32Array(numBands);
        this.Qs = new Float32Array(numBands);

        this.freqMapping = new Exp(20.0, 20000.0);

        this.initSpectrum();

        this.bands = this.initBands(numBands);
    }

    initSpectrum() {
        const qMap = new Exp(20.0, 1.0);

        for (let i = 0; i < this.numBands; i++) {
            const x = i / (this.numBands - 1);
            this.carrierFrequencies[i] = this.freqMapping.y((x + 0.067) * 0.8) * 1.5;
            this.modulatorFrequencies[i] = this.freqMapping.y((x + 0.067) * 0.8) * 1.0;
            this.Qs[i] = qMap.y(x);
        }

        console.log("carrierFrequencies", this.carrierFrequencies);
        console.log("modulatorFrequencies", this.modulatorFrequencies);
        console.log("Qs", this.Qs);
    }

    initBands(numBands) {
        const bands = new Array(numBands);
        for (let i = 0; i < numBands; i++) {
            bands[i] = new VocoderBand(
                this.context,
                this.carrier, this.modulator, this.output,
                this.carrierFrequencies[i],
                this.modulatorFrequencies[i],
                this.Qs[i],
                120.0
            );
        }
        return bands;
    }
}

export class VocoderSpectrum {
    constructor(vocoder) {
        this.vocoder = vocoder;

        this.root = document.createElement("div");
        this.root.style.width = "512px";
        this.root.style.height = "224px";
        this.root.style.backgroundColor = "#202020";
        this.root.style.borderRadius = "1px";
        this.root.style.position = "relative";
        this.root.style.boxSizing = "border-box";
        this.root.style.margin = "1px 0"

        this.labelCanvas = document.createElement("canvas");
        this.labelCanvas.style.position = "absolute";
        this.labelCanvas.style.width = "512px";
        this.labelCanvas.style.height = "224px";
        this.labelContext = this.labelCanvas.getContext("2d");
        this.root.appendChild(this.labelCanvas);

        this.plotterCanvas = document.createElement("canvas");
        this.plotterCanvas.style.margin = "32px";
        this.plotterCanvas.style.position = "absolute";
        this.plotterCanvas.style.width = "448px";
        this.plotterCanvas.style.height = "160px";
        this.plotterContext = this.plotterCanvas.getContext("2d");
        this.root.appendChild(this.plotterCanvas);

        this.width = NaN;
        this.height = NaN;
        this.devicePixelRatio = NaN;
        this.frequencyHz = null;
        this.magResponse = null;
        this.phaseResponse = null;
        this.start();
    }

    get domElement() {
        return this.root;
    }

    start() {
        const update = () => {
            const devicePixelRatio = window.devicePixelRatio;
            if (
                this.width !== this.root.clientWidth ||
                this.height !== this.root.clientHeight ||
                this.devicePixelRatio !== devicePixelRatio) {
                this.width = this.root.clientWidth;
                this.height = this.root.clientHeight;
                this.devicePixelRatio = devicePixelRatio;
                this.labelCanvas.width = this.root.clientWidth * devicePixelRatio;
                this.labelCanvas.height = this.root.clientHeight * devicePixelRatio;
                this.plotterCanvas.width = (this.root.clientWidth - 64) * devicePixelRatio;
                this.plotterCanvas.height = (this.root.clientHeight - 64) * devicePixelRatio;
                this.drawLabels();
            }
            this.update(); // TODO only on changes
            window.requestAnimationFrame(update);
        };
        window.requestAnimationFrame(update);
    }

    drawLabels() {
        const context = this.labelContext;
        const pixelRatio = window.devicePixelRatio;
        const width = this.width;
        const height = this.height;
        const freqMapping = this.vocoder.freqMapping;
        context.save();
        context.scale(pixelRatio, pixelRatio);
        context.clearRect(0, 0, width, height);
        context.beginPath();
        context.strokeStyle = "#777";
        context.globalAlpha = 0.3;
        for (let hz of Analyser.DIVIDERS) {
            const x = freqMapping.x(hz) * (width - 64);
            context.moveTo(32.5 + x, 32);
            context.lineTo(32.5 + x, height - 32);
        }
        for (let y = 0; y < 7; y++) {
            context.moveTo(32, 32.5 + y * 32);
            context.lineTo(width - 32, 32.5 + y * 32);
        }
        context.stroke();
        context.globalAlpha = 1.0;
        context.fillStyle = "#CCC";
        context.font = "14px Open sans";
        context.textBaseline = "top";
        context.textAlign = "center";
        context.fillText("VOCODER SPECTRUM", width * 0.5, 6.0);
        context.fillStyle = "#777";
        context.font = "8px Open sans";
        for (let hz of Analyser.DIVIDERS) {
            const x = freqMapping.x(hz) * (width - 64);
            if (hz < 1000) {
                context.fillText(hz + "Hz", 32.5 + x, height - 24);
            } else {
                context.fillText((Math.round(hz / 100) / 10.0).toFixed(1) + "kHz", 32.5 + x, height - 24);
            }
        }
        context.textBaseline = "middle";
        context.textAlign = "right";
        context.fillText("-18db", 26, 32.5);
        context.fillText("0db", 26, 96.5);
        context.fillText("0db", 26, 128.5);
        context.fillText("-18db", 26, 192.5);
        context.restore();
    }

    update() {
        const now = performance.now();
        const canvas = this.plotterCanvas;
        const graphics = this.plotterContext;
        const width = canvas.width;
        const height = canvas.height;
        const bands = this.vocoder.bands;
        const freqMapping = this.vocoder.freqMapping;
        const numBands = bands.length;

        if (null === this.frequencyHz || this.frequencyHz.length !== width) {
            const n = width + 1;
            this.frequencyHz = new Float32Array(n);
            this.magResponse = new Float32Array(n);
            this.phaseResponse = new Float32Array(n);
            for (let i = 0; i < n; i++) {
                this.frequencyHz[i] = freqMapping.y(i / n);
            }
        }

        const dbToY = (mag) => (gainToDb(mag) + 18.0) / 18.0 * height / 5 * 2;
        graphics.save();
        graphics.clearRect(0, 0, width, height);
        graphics.globalCompositeOperation = "screen";

        for (let i = 0; i < numBands; i++) {
            const hue = i / numBands;
            const filter = bands[i].carrierFilter;
            filter.getFrequencyResponse(this.frequencyHz, this.magResponse, this.phaseResponse);
            graphics.beginPath();
            graphics.fillStyle = hsla(hue, 0.5, 0.5, 0.5);
            graphics.strokeStyle = hsla(hue, 0.5, 0.5, 1.0);
            graphics.moveTo(-1, height);
            graphics.lineTo(-1, height - dbToY(this.magResponse[0]));
            for (let x = 0; x <= width; x++) {
                graphics.lineTo(x, height - dbToY(this.magResponse[x]));
            }
            graphics.lineTo(width, height);
            graphics.stroke();
            graphics.fill();
        }
        for (let i = 0; i < numBands; i++) {
            const hue = i / numBands;
            const filter = bands[i].modulatorFilter;
            filter.getFrequencyResponse(this.frequencyHz, this.magResponse, this.phaseResponse);
            graphics.beginPath();
            graphics.fillStyle = hsla(hue, 0.5, 0.5, 0.5);
            graphics.strokeStyle = hsla(hue, 0.5, 0.5, 1.0);
            graphics.moveTo(-1, 0);
            graphics.lineTo(-1, dbToY(this.magResponse[0]));
            for (let x = 0; x <= width; x++) {
                graphics.lineTo(x, dbToY(this.magResponse[x]));
            }
            graphics.lineTo(width, 0);
            graphics.stroke();
            graphics.fill();
        }
        graphics.setLineDash([1, 3]);
        for (let i = 0; i < numBands; i++) {
            graphics.beginPath();
            graphics.strokeStyle = hsla(i / numBands, 0.8, 0.8, 1.0);
            const carrier = bands[i].carrierFilter;
            const modulator = bands[i].modulatorFilter;
            const cx = freqMapping.x(carrier.frequency.value) * width;
            const mx = freqMapping.x(modulator.frequency.value) * width;
            graphics.moveTo(mx, 64);
            graphics.lineTo(cx, 96);
            graphics.stroke();
        }
        graphics.setLineDash([]);
        graphics.restore();
    }
}