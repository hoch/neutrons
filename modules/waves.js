// WAVE-FORMS //
import {Module} from "./board.js";

export const sine = () => x => Math.sin(x * Math.PI * 2.0);
export const triangle = () => x => 1.0 - 4.0 * Math.abs(Math.floor(x + 0.25) - (x - 0.25));
export const sawtooth = () => x => 2.0 * (x - Math.floor(x + 0.5));
export const square = () => x => x - Math.floor(x + 0.5) < 0.0 ? -1.0 : 1.0;

// MODIFIER //
const identity = (a) => x => a(x);
export const inverse = a => x => -a(x);
export const reverse = a => x => a(1.0 - x);
export const loFi = (a, res) => {
    const t0 = res;
    const t1 = 1.0 / t0;
    return x => Math.round(a(x) * t0) * t1;
};
export const rate = (a, rate) => x => {
    const x0 = x * rate;
    return a(x0 - Math.floor(x0));
};
export const shift = (a, shift) => x => {
    const x0 = x - shift;
    return a(x0 - Math.floor(x0));
};
export const backAndForth = (a, rate) => x => {
    const x0 = x * rate;
    const xi = Math.floor(x0);
    return 0 === (xi & 1) ?
        a(x0 - Math.floor(x0)) :
        a(1.0 - (x0 - Math.floor(x0)));
};
export const fadeInOut = a => x => x < 0.5 ? a(x) * 2.0 * x : a(x) * (2.0 - 2.0 * x);

// BLEND- MODES //
export const alpha = (a, b, alpha) => {
    const oneMinusAlpha = 1.0 - alpha;
    return x => a(x) * oneMinusAlpha + b(x) * alpha;
};
export const gradient = (a, b) => x => a(x) * (1.0 - x) + b(x) * x;
export const min = (a, b) => x => Math.min(a(x), b(x));
export const max = (a, b) => x => Math.max(a(x), b(x));
export const absMin = (a, b) => x => {
    const ay = a(x);
    const by = b(x);
    return Math.abs(ay) < Math.abs(by) ? ay : by;
};
export const absMax = (a, b) => x => {
    const ay = a(x);
    const by = b(x);
    return Math.abs(ay) > Math.abs(by) ? ay : by;
};
export const multiply = (a, b) => x => a(x) * b(x);
export const difference = (a, b) => x => (a(x) - b(x)) * 0.5;
export const phaseMod = (a, b) => x => {
    const bx = b(x);
    return a(bx - Math.floor(bx));
};
export const trainSwap = (a, b, times) => {
    const r2 = 2.0 * times;
    return x => 0 === (Math.floor(x * r2) & 1) ? a(x) : b(x);
};
export const trainMirror = (a, b, times) => {
    const r2 = 2.0 * times;
    return x => 0 === (Math.floor(x * r2) + Math.floor(x * 2.0) & 1) ? a(x) : b(x);
};

import {NoFloat, LinearInt, Linear} from "./mapping.js";
import {ParameterBuilder} from "./parameter.js";
import {ParameterKnob} from "./editors.js";

export class Element {
    static create(id, factory, numInputs, numOutputs, parameters) {
        return Element(id, factory, numInputs, numOutputs, parameters);
    }

    constructor(id, factory, numInputs, numOutputs, parameters) {
        this.id = id;
        this.factory = factory;
        this.parameters = parameters;

        this.module = new Module(id, numInputs, numOutputs);
        this.controls = this.createControls();
        this.onParameterChanged = null;

        this.equation = null;
    }

    createControls() {
        const div = document.createElement("div");
        const parametersDiv = document.createElement("div");
        parametersDiv.display = "grid";
        parametersDiv.gridTemplateColumns = "auto auto auto";
        parametersDiv.style.margin = "8px 0";
        if (0 < this.parameters.length) {
            for (let parameter of this.parameters) {
                parametersDiv.appendChild(new ParameterKnob(parameter).domElement);
                parameter.addCallback(value => {
                    if (null !== this.onParameterChanged) {
                        this.onParameterChanged();
                    }
                });
            }
        } else {
            const infoDiv = document.createElement("div");
            infoDiv.textContent = "No parameters.";
            infoDiv.style.fontSize = "10px";
            infoDiv.style.color = "#999";
            parametersDiv.append(infoDiv);
        }
        const equationDiv = document.createElement("div");
        equationDiv.textContent = this.factory;
        equationDiv.style.whiteSpace = "pre-wrap";
        equationDiv.style.wordBreak = "break-word";
        equationDiv.style.fontSize = "10px";
        equationDiv.style.color = "#999";
        div.append(parametersDiv);
        div.append(equationDiv);
        return div;
    }

    toObject() {
        const numParameters = this.parameters.length;
        const p = new Float32Array(numParameters);
        for (let i = 0; i < numParameters; i++) {
            p[i] = this.parameters[i].unipolar;
        }
        return {
            id: this.id,
            x: this.module.x + Math.floor(this.module.width * 0.5),
            y: this.module.y + Math.floor(this.module.height * 0.5),
            p: p
        };
    }
}

export const map = new Map();
export const register = (id, factory, numInputs, numOutputs, parameters) => {
    const elementFactory = () => new Element(id, factory, numInputs, numOutputs, parameters);
    map.set(id, elementFactory);
    return elementFactory;
};
export const createById = (create, id, x, y) => {
    const element = create(map.get(id), x, y);
    if (id === "output") {
        element.module.removeable = false;
    }
    return element;
};

const EmptyParameters = [];
export const sineElement = register("sine", sine, 0, 1, EmptyParameters);
export const triangleElement = register("triangle", triangle, 0, 1, EmptyParameters);
export const sawtoothElement = register("sawtooth", sawtooth, 0, 1, EmptyParameters);
export const squareElement = register("square", square, 0, 1, EmptyParameters);

export const inverseElement = register("inverse", inverse, 1, 1, EmptyParameters);
export const reverseElement = register("reverse", reverse, 1, 1, EmptyParameters);
export const loFiElement = register("loFi", loFi, 1, 1, [
    ParameterBuilder.begin("Resolution")
        .value(2)
        .valueMapping(new LinearInt(1, 16))
        .printMapping(NoFloat)
        .unit("#")
        .create()
]);
export const rateElement = register("rate", rate, 1, 1, [
    ParameterBuilder.begin("Rate")
        .value(2)
        .valueMapping(new LinearInt(1, 32))
        .printMapping(NoFloat)
        .unit("#")
        .create()
]);
export const shiftElement = register("shift", shift, 1, 1, [
    ParameterBuilder.begin("Shift")
        .value(0.25)
        .valueMapping(Linear.Identity)
        .create()
]);
export const backAndForthElement = register("backAndForth", backAndForth, 1, 1, [
    ParameterBuilder.begin("Rate")
        .value(2)
        .valueMapping(new LinearInt(2, 32))
        .printMapping(NoFloat)
        .unit("#")
        .create()
]);
export const trainSwapElement = register("trainSwap", trainSwap, 2, 1, [
    ParameterBuilder.begin("Times")
        .value(5)
        .valueMapping(new LinearInt(2, 32))
        .printMapping(NoFloat)
        .unit("#")
        .create()
]);
export const trainMirrorElement = register("trainMirror", trainMirror, 2, 1, [
    ParameterBuilder.begin("Times")
        .value(5)
        .valueMapping(new LinearInt(2, 32))
        .printMapping(NoFloat)
        .unit("#")
        .create()
]);
export const fadeInOutElement = register("fadeInOut", fadeInOut, 1, 1, EmptyParameters);

export const alphaElement = register("alpha", alpha, 2, 1, [
    ParameterBuilder.begin("Alpha")
        .value(0.5)
        .anchor(0.5)
        .valueMapping(Linear.Identity)
        .create()
]);
export const gradientElement = register("gradient", gradient, 2, 1, EmptyParameters);
export const minElement = register("min", min, 2, 1, EmptyParameters);
export const maxElement = register("max", max, 2, 1, EmptyParameters);
export const absMinElement = register("absMin", absMin, 2, 1, EmptyParameters);
export const absMaxElement = register("absMax", absMax, 2, 1, EmptyParameters);
export const multiplyElement = register("multiply", multiply, 2, 1, EmptyParameters);
export const differenceElement = register("difference", difference, 2, 1, EmptyParameters);
export const phaseModElement = register("phaseMod", phaseMod, 2, 1, EmptyParameters);
export const splitterElement = register("splitter", identity, 1, 2, EmptyParameters);
export const outputElement = register("output", identity, 1, 0, EmptyParameters);

export const list = (board, create) => {
    let dragEntry = null;
    let dragElement = null;
    const reset = ignore => {
        if (null !== dragEntry) {
            dragEntry.style.cursor = "grab";
        }
        dragEntry = null;
        dragElement = null;
        document.body.style.cursor = "";
        window.removeEventListener("mouseup", reset);
    };
    const target = board.svg;
    target.addEventListener("mouseover", event => {
        if (null !== dragElement) {
            const rect = target.getBoundingClientRect();
            const newElement = create(dragElement, (event.pageX - rect.x) - board.translateX, (event.pageY - rect.y) - board.translateY);
            reset(event);
            board.onModuleDown(newElement.module, false, false);
        }
    });
    const createEntry = (name, element, description) => {
        const entry = document.createElement("div");
        entry.classList.add("tooltip");
        entry.classList.add("funkEntry");
        entry.style.cursor = "grab";
        entry.textContent = name;
        entry.onmousedown = ignore => {
            dragEntry = entry;
            dragElement = element;
            entry.style.cursor = "";
            document.body.style.cursor = "grabbing";
            window.addEventListener("mouseup", reset);
        };
        const tooltip = document.createElement("span");
        tooltip.className = "tooltip text";
        tooltip.textContent = description;
        entry.append(tooltip);
        return entry;
    };
    const createHeader = text => {
        const header = document.createElement("h5");
        header.textContent = text;
        header.style.marginTop = "4px";
        header.style.color = "#EAEAEA";
        return header;
    };
    const div = document.createElement("div");
    const header = document.createElement("h3");
    header.textContent = "Library";
    const list = document.createElement("div");
    list.append(createHeader("Generators"));
    list.append(createEntry("Sine", sineElement, "Generates a sinus wave"));
    list.append(createEntry("Triangle", triangleElement, "Generates a triangle wave"));
    list.append(createEntry("Sawtooth", sawtoothElement, "Generates a sawtooth wave"));
    list.append(createEntry("Square", squareElement, "Generates a square wave"));
    list.append(createHeader("Modifiers"));
    list.append(createEntry("Inverse", inverseElement, "Inverse the amplitudes"));
    list.append(createEntry("Reverse", reverseElement, "Reverses the phase"));
    list.append(createEntry("LoFi", loFiElement, "Quantize the amplitudes"));
    list.append(createEntry("Rate", rateElement, "Increases the speed of the phase"));
    list.append(createEntry("Shift", shiftElement, "Shifts the phase"));
    list.append(createEntry("Back and Forth", backAndForthElement, "Loops the input"));
    list.append(createEntry("Fade In/Out", fadeInOutElement, "Fades to zero at edges"));
    list.append(createHeader("Blendmodes"));
    list.append(createEntry("Alpha", alphaElement, "Crossfades between equations with parameter"));
    list.append(createEntry("Gradient", gradientElement, "Crossfades between equation from start to end"));
    list.append(createEntry("Math.min", minElement, "Outputs the minimum value of both equations"));
    list.append(createEntry("Math.max", maxElement, "Outputs the maximum value of both equations"));
    list.append(createEntry("Math.abs(min)", absMinElement, "Outputs the minimum absolute value of both equations"));
    list.append(createEntry("Math.abs(max)", absMaxElement, "Outputs the maximum absolute value of both equations"));
    list.append(createEntry("Multiply", multiplyElement, "Multiplies two equations"));
    list.append(createEntry("Difference", differenceElement, "Returns the difference of two equations"));
    list.append(createEntry("Phase modulation", phaseModElement, "Uses second equation to modulate the phase of the first equation"));
    list.append(createEntry("Train Swap", trainSwapElement, "Switches between two equations"));
    list.append(createEntry("Train Mirror", trainMirrorElement, "Switches between two equations (mirrored at center)"));
    list.append(createHeader("Utility"));
    list.append(createEntry("Splitter", splitterElement, "Split the signal into two identical outputs"));
    div.append(header);
    div.append(list);
    return div;
};