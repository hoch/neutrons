import {SVG} from "./svg.js";

export class GuitarTab {
    static more() {
        const map = (group, name) => {
            return new GuitarTab(name, group[name][0].p.split(",").map(x => "x" === x ? -1 : parseInt(x)));
        };
        // copied from here > https://gschoppe.com/js/json-chords/
        // also interesting > http://jtab.tardate.com/
        return fetch("files/data/guitar-chords.json")
            .then(response => response.json())
            .then(data => {
                let count = 0;
                console.log("adding tabs...");
                for (let name in data.EADGBE) {
                    console.log(name);
                    GuitarTab.TABS[name] = map(data.EADGBE, name);
                    count++;
                }
                console.log("added", count, "tabs");
            });
    }

    static exists(name) {
        return undefined !== GuitarTab.TABS[name];
    }

    constructor(name, tabs) {
        this.name = name;
        this.tabs = tabs;
    }
}

// A few to start with. Call 'GuitarTab.more()'
GuitarTab.TABS = {
    "C": new GuitarTab("C", [-1, 3, 2, 0, 1, 0]),
    "G": new GuitarTab("G", [3, 2, 0, 0, 0, 3]),
    "Em": new GuitarTab("Em", [0, 2, 2, 0, 0, 0]),
    "Am": new GuitarTab("Am", [-1, 0, 2, 2, 1, 0]),
};

export class GuitarTabView {
    constructor() {
        this.svg = SVG.create(96, 104);
        this.svg.style.backgroundColor = "#222";
        this.svg.style.borderRadius = "1px";
        this.label = SVG.text(48, 11, "Cm", GuitarTabView.STYLE_TAB_NAME);
        this.svg.appendChild(this.label);
        this.types = [];
        this.fingers = [];
        for (let i = 0; i < 6; i++) {
            const type = SVG.text(8 + i * 16, 20, "x", GuitarTabView.STYLE_STRING_TYPE);
            this.svg.appendChild(type);
            this.types[i] = type;
        }
        this.svg.appendChild(SVG.rect(8, 24, 80, 4, GuitarTabView.STYLE_LINES));
        for (let i = 1; i <= 4; i++) {
            this.svg.appendChild(SVG.rect(8, 27 + i * 16, 80, 1, GuitarTabView.STYLE_LINES));
        }
        for (let i = 0; i < 6; i++) {
            this.svg.appendChild(SVG.rect(8 + i * 16, 24, 1, 76, GuitarTabView.STYLE_LINES));
        }
        for (let i = 0; i < 6; i++) {
            const finger = SVG.circle(8 + i * 16, 35, 4.5, GuitarTabView.STYLE_FINGERS);
            this.svg.appendChild(finger);
            this.fingers[i] = finger;
        }
    }

    show(tab) {
        this.label.setAttribute("text", tab.name);
        this.label.textContent = tab.name;
        for (let i = 0; i < 6; i++) {
            const type = this.types[i];
            const offset = tab.tabs[i];
            if (-1 === offset) {
                type.setAttribute("text", "x");
                type.textContent = "x";
                type.style.visibility = "visible";
            } else if (0 === offset) {
                type.setAttribute("text", "o");
                type.textContent = "o";
                type.style.visibility = "visible";
            } else {
                type.style.visibility = "hidden";
            }
            const finger = this.fingers[i];
            if (0 < offset) {
                finger.setAttribute("cy", 19 + offset * 16);
                finger.style.visibility = "visible";
            } else {
                finger.style.visibility = "hidden";
            }
        }
    }

    get domElement() {
        return this.svg;
    }
}

GuitarTabView.STYLE_TAB_NAME = {
    "font-family": "Open sans",
    "font-size": "12",
    "alignment-baseline": "middle",
    "text-anchor": "middle",
    "fill": "#FFFFFF"
};
GuitarTabView.STYLE_STRING_TYPE = {
    "font-family": "Open sans",
    "font-size": "9",
    "alignment-baseline": "middle",
    "text-anchor": "middle",
    "fill": "#999999"
};
GuitarTabView.STYLE_LINES = {
    "fill": "#999999"
};
GuitarTabView.STYLE_FINGERS = {
    "fill": "#CCCCCC"
};