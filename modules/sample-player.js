import {clamp, mouse} from "./standard.js";
import {Fragmentation} from "./sequencing.js";

export class SamplePlayer {
    constructor(context, effectBusA, effectBusB, buffer, name, duration, loop, gain) {
        this.context = context;
        this.buffer = buffer;
        this.duration = duration;
        this.loop = loop;
        this.gain = gain;

        this.root = document.createElement("div");
        this.root.style.display = "flex";
        this.root.style.alignItems = "center";
        this.canvas = document.createElement("canvas");
        this.canvas.onclick = ignore => this.toggleRunning();
        this.canvas.style.width = "48px";
        this.canvas.style.height = "48px";
        this.canvas.style.cursor = "pointer";
        this.root.appendChild(this.canvas);
        const labelName = document.createElement("div");
        labelName.style.margin = "0 8px";
        labelName.style.userSelect = "none";
        labelName.textContent = name;

        this.effectGainA = context.createGain();
        this.effectGainA.gain.value = 0.0;
        this.effectGainA.connect(effectBusA);
        this.effectGainB = context.createGain();
        this.effectGainB.gain.value = 0.0;
        this.effectGainB.connect(effectBusB);

        this.root.appendChild(this.createEffectBusButton("FX A", this.effectGainA.gain));
        this.root.appendChild(this.createEffectBusButton("FX B", this.effectGainB.gain));
        this.root.appendChild(labelName);
        this.graphics = this.canvas.getContext("2d");
        this.width = NaN;
        this.height = NaN;
        this.devicePixelRatio = NaN;
        this.lastStartTime = Number.NEGATIVE_INFINITY;
        this.running = false;

        const update = () => {
            if (
                this.width !== this.canvas.clientWidth ||
                this.height !== this.canvas.clientHeight ||
                this.devicePixelRatio !== window.devicePixelRatio) {
                this.width = this.canvas.clientWidth;
                this.height = this.canvas.clientHeight;
                this.devicePixelRatio = window.devicePixelRatio;
                this.canvas.width = this.canvas.clientWidth * window.devicePixelRatio;
                this.canvas.height = this.canvas.clientHeight * window.devicePixelRatio;
            }
            this.update();
            window.requestAnimationFrame(update);
        };
        window.requestAnimationFrame(update);
    }

    createEffectBusButton(effectBusName, gainParam) {
        const button = document.createElement("div");
        button.textContent = effectBusName;
        button.style.textAlign = "center";
        button.style.fontSize = "10px";
        button.style.lineHeight = "32px";
        button.style.width = "32px";
        button.style.height = "32px";
        button.style.borderRadius = "16px";
        button.style.margin = "0 8px";
        button.style.userSelect = "none";
        button.style.backgroundColor = "#19404d";
        mouse(button, ignore => {
            button.style.backgroundColor = "#28E5FF";
            gainParam.linearRampToValueAtTime(1.0, this.context.currentTime + 0.050);
        }, ignore => {
        }, ignore => {
            button.style.backgroundColor = "#19404d";
            gainParam.linearRampToValueAtTime(0.0, this.context.currentTime + 0.050);
        });
        return button;
    }

    toggleRunning() {
        return this.running = !this.running;
    }

    sequencer(output) {
        const fragmentation = new Fragmentation((computeStartMillis, stepIndex, position) => {
            const seconds = computeStartMillis(position) / 1000.0;
            const source = this.context.createBufferSource();
            source.buffer = this.buffer;
            source.loop = false;
            source.start(seconds);
            const gainNode = this.context.createGain();
            gainNode.gain.value = this.gain;
            source.connect(gainNode);
            gainNode.connect(output);
            gainNode.connect(this.effectGainA);
            gainNode.connect(this.effectGainB);
            this.lastStartTime = seconds;
            this.running = this.loop;
        }, this.duration);
        return (computeStartMillis, t0, t1) => {
            if (this.running) {
                fragmentation.equalise(computeStartMillis, t0, t1);
            }
        };
    }

    get domElement() {
        return this.root;
    }

    update() {
        const graphics = this.graphics;
        const width = this.width;
        const height = this.height;
        const pixelRatio = window.devicePixelRatio;
        const lineWidth = 12.0;
        const h2 = height * 0.5;
        const position = clamp(0.0, 1.0, (this.context.currentTime - this.lastStartTime) / this.buffer.duration);
        graphics.save();
        graphics.scale(pixelRatio, pixelRatio);
        graphics.clearRect(0, 0, width, height);
        graphics.beginPath();
        graphics.strokeStyle = "#19404d";
        graphics.lineWidth = lineWidth;
        graphics.arc(h2, h2, h2 - lineWidth * 0.5, 0.0, Math.PI * 2.0, false);
        graphics.stroke();
        graphics.beginPath();
        graphics.strokeStyle = "#28E5FF";
        graphics.lineWidth = lineWidth;
        graphics.arc(h2, h2, h2 - lineWidth * 0.5 - 1.0, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2.0 * position, false);
        graphics.stroke();

        if (this.running) {
            graphics.beginPath();
            graphics.fillStyle = "white";
            graphics.arc(h2, h2, 4.0, 0.0, Math.PI * 2.0, false);
            graphics.closePath();
            graphics.fill();
        }

        graphics.restore();
    }
}