import {SVG} from "./modules/svg.js";

const get_next_slide = () => {
    const slides = [
        "index.html",
        "subject.html#Web-Midi-Api",
        "wma.html",
        "list-devices.html",
        "midi-thru.html",
        "midi-arpeggio.html",
        "midi-mini-synth.html",
        "subject.html#Web-Audio-Api",
        "waa.html",
        "subject.html#AudioBufferSourceNode",
        "buffer-source-node.html",
        "subject.html#BiquadFilter-Node",
        "biquad-filter.html",
        "formant.html",
        "subject.html#Analyser-Node",
        "analyser.html",
        "subject.html#Oscillator-Node",
        "osc.html",
        "subject.html#Delay-Node",
        "echo.html",
        "flanger.html",
        "osc-biquad-delay.html",
        "dub-station.html",
        "subject.html#Convolver-Node",
        "convolver.html",
        "modules.html",
        "subject.html#Automation",
        "waa-automation.html",
        "tb303.html",
        "kicks.html",
        "digital-audio.html",
        "subject.html#Fourier-Transformation",
        "fourier.html",
        "fft.html",
        "waves.html",
        "space-prototype.html",
        "subject.html#Goertzel",
        "goertzel.html",
        "pitch-detection.html",
        "subject.html#Other-Synthesis",
        "karplus-strong.html",
        "subject.html#Sequencing",
        "tone-wheels.html",
        "pulsate.html",
        "euclidean.html",
        "subject.html#Chords",
        "chords.html",
        "subject.html#Meanwhile...",
        "loop-station.html",
        "circle-modulation.html",
        "universe.html"
    ];
    const path = document.location.href;
    const qIndex = path.lastIndexOf("?");
    const slide = path.substring(path.lastIndexOf("/") + 1, -1 === qIndex ? path.length : qIndex);
    const slideIndex = slides.indexOf(slide);
    if (-1 === slideIndex) {
        console.warn("Not indexed.");
        return null;
    }
    if (slideIndex + 1 === slides.length) {
        return null;
    }
    return slides[slideIndex + 1];
};

export const next_slide = (() => {
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    if (!isChrome) {
        alert("Please use Chrome. Most other browsers do not support latest web-apis!");
    }
    const footer = document.querySelector("footer");
    if (footer !== null) {
        footer.textContent = "https://github.com/andremichelle/neutrons/︎";
    }

    const href = get_next_slide();
    if (null === href) {
        return;
    }
    const next = () => location.href = href;
    const svg = SVG.create(32, 32);
    svg.appendChild(SVG.path({fill: "white"})
        .append("M277.58,179.679l-0.057,0.077c-5.125-4.705-11.857-7.631-19.335-7.631c-15.835,0-28.688,12.852-28.688,28.688" +
            "c0,8.377,3.634,15.835,9.352,21.076l-0.057,0.077L330.48,306l-91.686,84.055l0.057,0.076c-5.718,5.221-9.352,12.68-9.352,21.057" +
            "c0,15.836,12.852,28.688,28.688,28.688c7.478,0,14.21-2.926,19.335-7.611l0.057,0.076l114.75-105.188" +
            "c5.91-5.451,9.295-13.101,9.295-21.152s-3.385-15.702-9.295-21.152L277.58,179.679z M306,0C137.012,0,0,137.012,0,306" +
            "s137.012,306,306,306s306-137.012,306-306S474.988,0,306,0z M306,554.625C168.912,554.625,57.375,443.088,57.375,306" +
            "S168.912,57.375,306,57.375S554.625,168.912,554.625,306S443.088,554.625,306,554.625z")
        .complete());
    svg.setAttribute("viewBox", "0 0 612 612");
    svg.style.right = "32px";
    svg.style.bottom = "32px";
    svg.style.position = "absolute";
    svg.style.cursor = "pointer";
    svg.onclick = next;
    window.addEventListener("keydown", event => {
        if (!event.repeat && event.key === "ArrowRight") {
            next();
        }
    }, false);
    document.body.appendChild(svg);
    return next;
})();

export const prepareList = () => {
    const help = document.createElement("h5");
    help.style.top = "50%";
    help.style.left = "50%";
    help.style.transform = "translate(-50%, -50%)";
    help.style.position = "absolute";
    help.style.color = "#666";
    help.textContent = "▶︎";
    document.body.appendChild(help);
    const list = document.querySelector("ul.list");
    const items = list.getElementsByTagName("li");
    let index = 0;
    window.addEventListener("keydown", event => {
        if (!event.repeat && event.key === "ArrowRight") {
            console.log("list event");
            if (help.parentNode) help.remove();
            if (index < items.length) {
                items[index++].style.visibility = "visible";
                event.preventDefault();
                event.stopImmediatePropagation();
            }
        }
    }, true);
};