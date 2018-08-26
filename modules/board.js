import {ceilTo, TextMeasuring} from "./standard.js";

export class Board {
    constructor() {
        this.svg = document.createElementNS(Board.ns, "svg");
        this.svg.setAttribute("version", "1.1");
        this.svg.style.width = "100%";
        this.svg.style.height = "100%";
        this.svg.style.overflow = "hidden";
        this.layer = document.createElementNS(Board.ns, "g");
        this.moduleLayer = document.createElementNS(Board.ns, "g");
        this.moduleLayer.setAttribute("shape-rendering", "crispEdges");
        this.connectionLayer = document.createElementNS(Board.ns, "g");
        this.svg.appendChild(this.layer);
        this.layer.appendChild(this.moduleLayer);
        this.layer.appendChild(this.connectionLayer);

        this.modules = [];
        this.selection = [];
        this.omitSelectionNotification = false;
        this.selectionListener = null;
        this.connections = [];
        this.connectionChangeListener = null;
        this.translateX = 0 | 0;
        this.translateY = 0 | 0;
        this.updateCoordinates();

        this.connectTo = null;
        this.connectFrom = null;

        this.initBoardEvents();
    }

    updateCoordinates() {
        this.layer.setAttribute("transform", "translate(" + this.translateX + "," + this.translateY + ")");
    }

    beginConnection(slot, event) {
        const line = document.createElementNS(Board.ns, "line");
        line.setAttribute("stroke", "white");
        this.connectFrom = slot;
        this.connectionLayer.appendChild(line);
        const onWindowMouseUp = event => {
            if (null !== this.connectTo) {
                if (slot !== this.connectTo && slot.isInput !== this.connectTo.isInput) {
                    if (null !== this.connectTo.connection) {
                        this.disconnect(this.connectTo.connection);
                    }
                    this.connect(slot, this.connectTo);
                }
            }
            this.connectTo = null;
            this.connectFrom = null;
            this.connectionLayer.removeChild(line);
            window.removeEventListener("mousemove", onWindowMouseMove);
            window.removeEventListener("mouseup", onWindowMouseUp);
        };
        const onWindowMouseMove = event => {
            if (null === this.connectFrom) {
                this.connectTo = null;
                onWindowMouseUp(event);
                return;
            }
            const xy = slot.getXY();
            line.setAttribute("x1", xy.x);
            line.setAttribute("y1", xy.y);
            if (null === this.connectTo) {
                const rect = this.svg.getBoundingClientRect();
                line.setAttribute("x2", (event.pageX - rect.x) - this.translateX);
                line.setAttribute("y2", (event.pageY - rect.y) - this.translateY);
            } else {
                const xy = this.connectTo.getXY();
                line.setAttribute("x2", xy.x);
                line.setAttribute("y2", xy.y);
            }
        };
        window.addEventListener("mousemove", onWindowMouseMove);
        window.addEventListener("mouseup", onWindowMouseUp);
        onWindowMouseMove(event);
    }

    lockConnectionTo(slot) {
        if (null !== this.connectFrom && this.connectFrom.isInput !== slot.isInput) {
            this.connectTo = slot;
        }
    }

    unlockConnectionTo() {
        this.connectTo = null;
    }

    connect(source, target) {
        let connection;
        if (source.isInput) {
            connection = new ModuleConnection(target, source);
        } else {
            connection = new ModuleConnection(source, target);
        }
        this.connections.push(connection);
        this.connectionLayer.appendChild(connection.graphics);
        source.connection = connection;
        target.connection = connection;
        connection.update();
        this.notifyConnectionChange();
    }

    disconnect(connection) {
        connection.source.connection = null;
        connection.target.connection = null;
        connection.source = null;
        connection.target = null;
        this.connections.splice(this.connections.indexOf(connection), 1);
        this.connectionLayer.removeChild(connection.graphics);
        this.notifyConnectionChange();
    }

    notifyConnectionChange() {
        if (null !== this.connectionChangeListener) {
            this.connectionChangeListener();
        }
    }

    updateConnections() {
        for (let connection of this.connections) {
            connection.update();
        }
    }

    get domElement() {
        return this.svg;
    }

    onModuleDown(module, shiftMode, copyMode) {
        this.selectByMode(module, shiftMode && !copyMode);
        const beginMouseX = event.clientX;
        const beginMouseY = event.clientY;
        if (copyMode) {
            for (let i = 0; i < this.selection.length; i++) {
                const toCopy = this.selection[i];
                if (toCopy.removeable) {
                    const copy = toCopy.copy();
                    this.addModule(copy, toCopy.x, toCopy.y);
                    copy.selected = true;
                    toCopy.selected = false;
                    this.selection[i] = copy;
                }
            }
        }
        for (let selectedModule of this.selection) {
            selectedModule.beforeDragX = selectedModule.x;
            selectedModule.beforeDragY = selectedModule.y;
        }
        const onWindowMouseMove = event => {
            const deltaX = event.clientX - beginMouseX;
            const deltaY = event.clientY - beginMouseY;
            for (let selectedModule of this.selection) {
                selectedModule.moveTo(selectedModule.beforeDragX + deltaX, selectedModule.beforeDragY + deltaY);
            }
            this.updateConnections();
        };
        const onWindowMouseUp = event => {
            window.removeEventListener("mousemove", onWindowMouseMove);
            window.removeEventListener("mouseup", onWindowMouseUp);
        };
        window.addEventListener("mousemove", onWindowMouseMove);
        window.addEventListener("mouseup", onWindowMouseUp);
    }

    addModule(module, x, y) {
        module.moveTo(x, y);
        module.board = this;
        this.modules.push(module);
        this.moduleLayer.appendChild(module.graphics);
    }

    removeModule(module) {
        for (let slot of module.inputs) {
            if (null !== slot.connection) {
                this.disconnect(slot.connection);
            }
        }
        for (let slot of module.outputs) {
            if (null !== slot.connection) {
                this.disconnect(slot.connection);
            }
        }
        module.board = null;
        this.modules.splice(this.modules.indexOf(module), 1);
        this.moduleLayer.removeChild(module.graphics);
        this.connectFrom = null;
    }

    selectByMode(module, shiftMode) {
        this.omitSelectionNotification = true;
        const isSelected = this.selection.includes(module);
        if (isSelected) {
            if (shiftMode) {
                this.deselect(module);
            }
        } else {
            if (!shiftMode) {
                this.deselectAll();
            }
            this.select(module);
        }
        this.omitSelectionNotification = false;
        this.notifySelectionChange();
    }

    select(module) {
        this.selection.push(module);
        module.selected = true;
        this.notifySelectionChange();
    }

    deselect(module) {
        this.selection.splice(this.selection.indexOf(module), 1);
        module.selected = false;
        this.notifySelectionChange();
    }

    deselectAll() {
        const selection = this.selection;
        for (let selectedModule of selection) {
            selectedModule.selected = false;
        }
        selection.splice(0, selection.length);
        this.notifySelectionChange();
    }

    deleteSelection() {
        let index = this.selection.length;
        while (--index > -1) {
            const remove = this.selection[index];
            if (remove.removeable) {
                this.removeModule(remove);
                this.selection.splice(index, 1);
            }
        }
    }

    clear() {
        this.translateX = 0.0;
        this.translateY = 0.0;
        let index = this.modules.length;
        while (--index > -1) {
            this.removeModule(this.modules[index]);
        }
    }

    notifySelectionChange() {
        if (this.omitSelectionNotification) {
            return;
        }
        if (null !== this.selectionListener) {
            this.selectionListener(this.selection);
        }
    }

    serializeConnections() {
        const connections = [];
        for (let i = 0; i < this.connections.length; i++) {
            const connection = this.connections[i];
            const source = connection.source;
            const target = connection.target;
            connections.push({
                source: {
                    module: this.modules.indexOf(source.module),
                    slot: source.module.outputs.indexOf(source)
                },
                target: {
                    module: this.modules.indexOf(target.module),
                    slot: target.module.inputs.indexOf(target)
                }
            });
        }
        return connections;
    }

    initBoardEvents() {
        this.svg.addEventListener("mousedown", event => {
            if (event.target === event.currentTarget) {
                const beginMouseX = event.clientX;
                const beginMouseY = event.clientY;
                const beginTranslateX = this.translateX;
                const beginTranslateY = this.translateY;
                const onWindowMouseMove = event => {
                    this.translateX = (beginTranslateX + (event.clientX - beginMouseX)) | 0;
                    this.translateY = (beginTranslateY + (event.clientY - beginMouseY)) | 0;
                    this.updateCoordinates();
                };
                const onWindowMouseUp = event => {
                    window.removeEventListener("mousemove", onWindowMouseMove);
                    window.removeEventListener("mouseup", onWindowMouseUp);
                };
                window.addEventListener("mousemove", onWindowMouseMove);
                window.addEventListener("mouseup", onWindowMouseUp);
                this.deselectAll();
            }
        });
        window.addEventListener("keydown", event => {
            if (!event.repeat) {
                if (event.keyCode === 46 || event.keyCode === 8) {
                    this.deleteSelection();
                }
            }
        });
    }
}

Board.font = "Open sans";
Board.fontSize = 11;
Board.textMeasure = new TextMeasuring(Board.font, Board.fontSize);
Board.ns = "http://www.w3.org/2000/svg";

export class Module {
    constructor(name, numInputs, numOutputs) {
        this.name = name;
        this.numInputs = numInputs;
        this.numOutputs = numOutputs;

        this.board = null;

        const measure = Board.textMeasure.measure(name);
        const textWidth = Math.ceil(measure.width);
        const textHeight = Math.ceil(measure.height);
        const inputsWidth = (numInputs - 1) * Module.connectorPadding;
        const outputsWidth = (numOutputs - 1) * Module.connectorPadding;

        this.width = ceilTo(Math.max(
            inputsWidth + Module.connectorMargin * 2.0,
            outputsWidth + Module.connectorMargin * 2.0,
            textWidth + Module.textHorizontalMargin * 2.0), 8);
        this.height = ceilTo(textHeight + Module.textVerticalMargin * 2.0, 8);

        this.x = 0.0;
        this.y = 0.0;
        this.removeable = true;
        this.beforeDragX = NaN;
        this.beforeDragY = NaN;

        this.background = document.createElementNS(Board.ns, "rect");
        this.background.setAttribute("x", "0");
        this.background.setAttribute("y", "0");
        this.background.setAttribute("width", this.width);
        this.background.setAttribute("height", this.height);
        this.textElement = document.createElementNS(Board.ns, "text");
        this.textElement.setAttribute("x", Math.round((this.width - textWidth) * 0.5) + 0.5);
        this.textElement.setAttribute("y", Math.round(this.height * 0.5) + 0.5);
        this.textElement.setAttribute("font-family", "Open sans");
        this.textElement.setAttribute("font-weight", "lighter");
        this.textElement.setAttribute("font-size", Board.fontSize);
        this.textElement.setAttribute("alignment-baseline", "middle");
        this.textElement.style.userSelect = "none";
        this.textElement.style.pointerEvents = "none";
        this.textElement.textContent = name;
        this.graphics = document.createElementNS(Board.ns, "g");
        this.graphics.appendChild(this.background);
        this.graphics.appendChild(this.textElement);

        this.inputs = [];
        this.outputs = [];
        {
            const deltaX = Math.round((this.width - inputsWidth) * 0.5);
            for (let i = 0; i < numInputs; i++) {
                const x = Math.round(deltaX + i * Module.connectorPadding);
                const input = new ModuleSlot(this, true).setXY(x, 5);
                this.inputs.push(input);
                this.graphics.appendChild(input.graphics);
            }
        }
        {
            const deltaX = Math.round((this.width - outputsWidth) * 0.5);
            for (let i = 0; i < numOutputs; i++) {
                const x = Math.round(deltaX + i * Module.connectorPadding);
                const output = new ModuleSlot(this, false).setXY(x, this.height - 5);
                this.outputs.push(output);
                this.graphics.appendChild(output.graphics);
            }
        }
        this.background.addEventListener("mousedown", event => {
            if (event.target === event.currentTarget) {
                this.board.onModuleDown(this, event.shiftKey, event.metaKey);
            }
        });
        this.selected = false;
    }

    moveTo(x, y) {
        this.graphics.setAttribute("transform", "translate(" + x + "," + y + ")");
        this.x = x;
        this.y = y;
    }

    set selected(value) {
        const strokeStyle = value ? "#28E5FF" : "#062845";
        this.textElement.setAttribute("stroke", strokeStyle);
        this.background.setAttribute("stroke", strokeStyle);
        this.background.setAttribute("fill", value ? "#333333" : "#AAAAAA");
    }

    onSlotDown(slot, event) {
        const connection = slot.connection;
        if (null === connection) {
            this.board.beginConnection(slot, event);
        } else {
            this.board.beginConnection(slot === connection.target ? connection.source : connection.target, event);
            this.board.disconnect(connection);
        }
    }

    onSlotDragOver(slot) {
        this.board.lockConnectionTo(slot);
    }

    onSlotDragOut(slot) {
        this.board.unlockConnectionTo();
    }

    copy() { // override for more complex copy
        const copy = new Module(this.name, this.numInputs, this.numOutputs);
        copy.board = this.board;
        return copy;
    }
}

Module.connectorMargin = 16;
Module.connectorPadding = 32;
Module.textHorizontalMargin = 8;
Module.textVerticalMargin = 16;

export class ModuleSlot {
    constructor(module, isInput) {
        this.module = module;
        this.isInput = isInput;
        this.graphics = document.createElementNS(Board.ns, "g");
        const rect = document.createElementNS(Board.ns, "rect");
        rect.setAttribute("x", "-4");
        rect.setAttribute("y", "-4");
        rect.setAttribute("width", "8");
        rect.setAttribute("height", "8");
        rect.setAttribute("fill", "#28E5FF");
        rect.style.pointerEvents = "none";

        const hitarea = document.createElementNS(Board.ns, "rect");
        hitarea.setAttribute("x", "-8");
        hitarea.setAttribute("y", "-8");
        hitarea.setAttribute("width", "16");
        hitarea.setAttribute("height", "16");
        hitarea.setAttribute("fill", "transparent");

        this.graphics.style.cursor = "pointer";
        this.graphics.appendChild(hitarea);
        this.graphics.appendChild(rect);
        this.graphics.addEventListener("mousedown", event => module.onSlotDown(this, event));
        this.graphics.addEventListener("mouseover", event => {
            if (event.buttons) {
                module.onSlotDragOver(this);
            }
        });
        this.graphics.addEventListener("mouseout", event => {
            if (event.buttons) {
                module.onSlotDragOut(this);
            }
        });
        this.x = NaN;
        this.y = NaN;
        this.connection = null;
    }

    setXY(x, y) {
        this.x = x;
        this.y = y;
        this.graphics.setAttribute("transform", "translate(" + x + "," + y + ")");
        return this;
    }

    getXY() {
        return {x: this.x + this.module.x, y: this.y + this.module.y};
    }
}

export class ModuleConnection {
    constructor(source, target) {
        this.source = source;
        this.target = target;

        this.graphics = document.createElementNS(Board.ns, "line");
        this.graphics.setAttribute("stroke", "#28E5FF");
        this.graphics.style.pointerEvents = "none";
    }

    update() {
        const sourceXY = this.source.getXY();
        const targetXY = this.target.getXY();
        this.graphics.setAttribute("x1", sourceXY.x);
        this.graphics.setAttribute("y1", sourceXY.y);
        this.graphics.setAttribute("x2", targetXY.x);
        this.graphics.setAttribute("y2", targetXY.y);
    }
}