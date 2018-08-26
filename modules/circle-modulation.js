import {PI_2} from "./neutrons.js";
import {clamp} from "./standard.js";
import {ParameterBuilder} from "./parameter.js";
import {LinearInt, NoFloat} from "./mapping.js";
import {ParameterField} from "./editors.js";

export class CircleModulation {
    constructor(mapping, name) {
        this.mapping = mapping;

        this.root = document.createElement("div");
        this.root.style.width = "256px";
        this.root.style.display = "inline-flex";
        this.root.style.flexDirection = "column";
        this.canvas = document.createElement("canvas");
        this.canvas.style.width = "256px";
        this.canvas.style.height = "256px";

        this.context = this.canvas.getContext("2d");
        this.width = NaN;
        this.height = NaN;
        this.devicePixelRatio = NaN;
        this.resolution = 128;
        this.centerX = 128;
        this.centerY = 128;
        this.radius = 120.0;
        this.values = new Float32Array(this.resolution);
        this.angle = 0.0;
        this.recording = NaN;
        this.snapping = ParameterBuilder
            .begin("Snapping")
            .valueMapping(new LinearInt(0, 16))
            .printMapping(NoFloat)
            .unit("")
            .value(0)
            .create();

        const controls = this.createControlLayer();
        controls.appendChild(this.createButtonSmooth());
        controls.appendChild(this.createFieldSnapping());
        this.root.appendChild(this.createLabel(name));
        this.root.appendChild(this.canvas);
        this.root.appendChild(controls);

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

        this.initEvents(this.canvas);
    }

    get domElement() {
        return this.root;
    }

    createLabel(name) {
        const label = document.createElement("label");
        label.style.textAlign = "center";
        label.textContent = name;
        return label;
    }

    createControlLayer() {
        const controls = document.createElement("div");
        controls.style.display = "flex";
        controls.style.justifyContent = "center";
        controls.style.alignItems = "center";
        controls.style.borderRadius = "3px";
        controls.style.border = "1px #28E5FF solid";
        controls.style.marginTop = "8px";
        return controls;
    }

    createButtonSmooth() {
        const buttonSmooth = document.createElement("button");
        buttonSmooth.textContent = "Smooth";
        buttonSmooth.addEventListener("mousedown", ignore => {
            this.smooth();
        });
        return buttonSmooth;
    }

    createFieldSnapping() {
        return new ParameterField(this.snapping).domElement;
    }

    setAngle(value) {
        this.angle = value - Math.floor(value);

        if (this.isRecording()) {
            this.values[Math.floor((this.angle - Math.floor(this.angle)) * this.resolution)] = 1.0 - this.snapValue(this.recording);
        }
    }

    isRecording() {
        return !isNaN(this.recording);
    }

    value() {
        const x = this.angle;
        return this.mapping.y(this.values[Math.floor((x - Math.floor(x)) * this.resolution)]);
    }

    smooth() {
        const values = this.values;
        for (let i = 0; i < this.resolution; i++) {
            const target = (values[this.clampIndex(i - 1)] + values[this.clampIndex(i + 1)]) * 0.5;
            values[i] += (target - values[i]) * 0.5;
        }
    }

    snapValue(x) {
        const value = this.snapping.value;
        if (0 === value) {
            return x;
        }
        return Math.round(x * value) / value;
    }

    clampIndex(index) {
        return index < 0 ? index + this.resolution : index >= this.resolution ? index - this.resolution : index;
    }

    update() {
        const context = this.context;
        const width = this.width;
        const height = this.height;
        const pixelRatio = window.devicePixelRatio;
        const x = this.centerX;
        const y = this.centerY;
        context.save();
        context.scale(pixelRatio, pixelRatio);
        context.clearRect(0, 0, width, height);

        context.beginPath();
        context.strokeStyle = "#777";
        context.arc(x, y, this.radius + 1.0, 0.0, Math.PI * 2.0, false);
        context.stroke();

        const step = PI_2 / this.resolution;
        context.beginPath();
        context.fillStyle = "rgba(40, 229, 255, 0.1)";
        context.strokeStyle = "#28E5FF";
        const neg_angle = -this.angle * 2.0 * Math.PI;
        {
            const r = this.radius * (1.0 - this.values[0]);
            context.moveTo(x + Math.sin(neg_angle) * r, y + Math.cos(neg_angle) * r);
        }
        for (let i = 1; i < this.resolution; i++) {
            const a = neg_angle + i * step;
            const r = this.radius * (1.0 - this.values[i]);
            context.lineTo(x + Math.sin(a) * r, y + Math.cos(a) * r);
        }
        context.closePath();
        context.stroke();
        context.fill();

        context.beginPath();
        context.strokeStyle = "#28E5FF";
        context.setLineDash([1, 2]);
        context.moveTo(x + 0.5, y);
        context.lineTo(x + 0.5, y + this.radius);
        context.closePath();
        context.stroke();
        context.setLineDash([]);
        context.fillStyle = this.isRecording() ? "red" : "white";
        context.arc(x, y + this.radius - this.values[Math.floor(this.angle * this.values.length)] * this.radius, 3, 0.0, 2.0 * Math.PI, false);
        context.fill();
        context.restore();
    }

    initEvents(canvas) {
        const onMouseMove = event => {
            const clientRect = canvas.getBoundingClientRect();
            this.recording = clamp(0.0, 1.0, (event.clientY - clientRect.y - this.centerY) / this.radius);
        };
        const onMouseUp = ignore => {
            this.recording = NaN;
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };
        const onMouseDown = event => {
            const clientRect = canvas.getBoundingClientRect();
            const value = (event.clientY - clientRect.y - this.centerY) / this.radius;
            if (0.0 <= value) {
                this.recording = clamp(0.0, 1.0, value);
                window.addEventListener("mousemove", onMouseMove);
                window.addEventListener("mouseup", onMouseUp);
            }
        };
        canvas.addEventListener("mousedown", onMouseDown);
    }
}