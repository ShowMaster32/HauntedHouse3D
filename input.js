class Input {
    constructor() {
        this._keyMap = {};
        this.events = [];
        this.mouseDelta = { x: 0, y: 0 };
        this.lastMousePosition = { x: 0, y: 0 };

        this.AddKeyDownListner(this._onKeyDown);
        this.AddKeyUpListner(this._onKeyUp);
        this.AddMouseMoveListner(this._onMouseMove);
    }

    _addEventListner(element, type, callback) {
        element.addEventListener(type, callback);
        this.events.push({ element, type, callback });
    }

    AddKeyDownListner(callback) {
        this._addEventListner(document, 'keydown', callback);
    }

    AddKeyUpListner(callback) {
        this._addEventListner(document, 'keyup', callback);
    }

    AddMouseMoveListner(callback) {
        this._addEventListner(document, 'mousemove', callback);
    }

    AddClickListner(callback) {
        this._addEventListner(document.body, 'click', callback);
    }

    AddMouseDownListner(callback) {
        this._addEventListner(document.body, 'mousedown', callback);
    }

    AddMouseUpListner(callback) {
        this._addEventListner(document.body, 'mouseup', callback);
    }

    _onKeyDown = (event) => {
        this._keyMap[event.code] = 1;
    }

    _onKeyUp = (event) => {
        this._keyMap[event.code] = 0;
    }

    _onMouseMove = (event) => {
        this.mouseDelta.x = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        this.mouseDelta.y = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
    }

    GetKeyDown(code) {
        return this._keyMap[code] === undefined ? 0 : this._keyMap[code];
    }

    GetMouseMovement() {
        const delta = { ...this.mouseDelta };
        this.mouseDelta.x = 0;
        this.mouseDelta.y = 0;
        return delta;
    }

    ClearEventListners() {
        this.events.forEach(e => {
            e.element.removeEventListener(e.type, e.callback);
        });

        this.events = [];
        this.AddKeyDownListner(this._onKeyDown);
        this.AddKeyUpListner(this._onKeyUp);
        this.AddMouseMoveListner(this._onMouseMove);
    }
}

const inputInstance = new Input();
export default inputInstance;
