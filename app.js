"use strict";

// Classe Input come da esempio
class Input {
    constructor() {
        this._keyMap = {};
        this.events = [];

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
        this._keyMap[event.code] = true;
    }

    _onKeyUp = (event) => {
        this._keyMap[event.code] = false;
    }

    _onMouseMove = (event) => {
        this.mouseMovementX = event.movementX || 0;
        this.mouseMovementY = event.movementY || 0;
    }

    GetKeyDown(code) {
        return this._keyMap[code] || false;
    }

    GetMouseMovementX() {
        return this.mouseMovementX;
    }

    GetMouseMovementY() {
        return this.mouseMovementY;
    }

    ClearMouseMovement() {
        this.mouseMovementX = 0;
        this.mouseMovementY = 0;
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

function main() {
    var canvas = document.querySelector("#canvas");
    var gl = canvas.getContext("webgl");
    if (!gl) {
        console.error("WebGL not supported");
        return;
    }

    var program = webglUtils.createProgramFromScripts(gl, ["vertex-shader-3d", "fragment-shader-3d"]);
    var skyboxProgram = webglUtils.createProgramFromScripts(gl, ["skybox-vertex-shader", "skybox-fragment-shader"]);
    if (!program || !skyboxProgram) {
        console.error("Failed to create program");
        return;
    }
    console.log("Program created");

    var positionLocation = gl.getAttribLocation(program, "a_position");
    var texcoordLocation = gl.getAttribLocation(program, "a_texcoord");
    var matrixLocation = gl.getUniformLocation(program, "u_matrix");
    var textureLocation = gl.getUniformLocation(program, "u_texture");

    var skyboxPositionLocation = gl.getAttribLocation(skyboxProgram, "a_position");
    var skyboxViewDirectionProjectionInverseLocation = gl.getUniformLocation(skyboxProgram, "u_viewDirectionProjectionInverse");
    var skyboxTextureLocation = gl.getUniformLocation(skyboxProgram, "u_skybox");

    gl.useProgram(program);

    var positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    setFloorAndWallGeometry(gl);
    console.log("Geometry set");

    var texcoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    setFloorAndWallTexcoords(gl);
    console.log("Texcoords set");

    var woodTexture = gl.createTexture();
    var wallTexture = gl.createTexture();
    var skyboxTexture = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTexture);
    const faceInfos = [
        { target: gl.TEXTURE_CUBE_MAP_POSITIVE_X, url: 'textures/skybox/px.png' },
        { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X, url: 'textures/skybox/nx.png' },
        { target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y, url: 'textures/skybox/py.png' },
        { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, url: 'textures/skybox/ny.png' },
        { target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z, url: 'textures/skybox/pz.png' },
        { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, url: 'textures/skybox/nz.png' },
    ];
    faceInfos.forEach((faceInfo) => {
        const { target, url } = faceInfo;
        const level = 0;
        const internalFormat = gl.RGBA;
        const width = 1024;
        const height = 1024;
        const format = gl.RGBA;
        const type = gl.UNSIGNED_BYTE;
        gl.texImage2D(target, level, internalFormat, width, height, 0, format, type, null);

        const image = new Image();
        image.src = url;
        image.addEventListener('load', function () {
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTexture);
            gl.texImage2D(target, level, internalFormat, format, type, image);
            gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
        });
    });

    var floorImage = new Image();
    floorImage.src = 'textures/wood.jpg'; // Percorso alla tua texture del pavimento in legno
    floorImage.addEventListener('load', function () {
        gl.bindTexture(gl.TEXTURE_2D, woodTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, floorImage);
        gl.generateMipmap(gl.TEXTURE_2D);
        console.log("Floor texture loaded");
    });

    var wallImage = new Image();
    wallImage.src = 'textures/wall.jpg'; // Percorso alla tua texture del muro
    wallImage.addEventListener('load', function () {
        gl.bindTexture(gl.TEXTURE_2D, wallTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, wallImage);
        gl.generateMipmap(gl.TEXTURE_2D);
        console.log("Wall texture loaded");
    });

    const fieldOfViewRadians = degToRad(60);
    const cameraPosition = vec3.fromValues(0, -1.6, 0); // Altezza della telecamera all'altezza di una persona
    const up = vec3.fromValues(0, -1, 0); // Invertiamo l'asse Y
    const cameraSpeed = 0.05;
    const rotationSpeed = 0.002; // Velocità di rotazione ridotta
    const verticalSpeed = 0.05;

    let yaw = 0;
    let pitch = 0;
    let mouseLocked = false;

    document.getElementById('start-button').addEventListener('click', startGame);

    function startGame() {
        document.getElementById('start-menu').style.display = 'none';
        canvas.style.display = 'block';
        document.getElementById('crosshair').style.display = 'block';
        canvas.requestPointerLock();
    }

    document.addEventListener('pointerlockchange', () => {
        mouseLocked = !!document.pointerLockElement;
    });

    document.addEventListener('mousemove', (event) => {
        if (!mouseLocked) return;
        yaw += event.movementX * rotationSpeed; // invertito
        pitch -= event.movementY * rotationSpeed; // invertito
        pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
    });

    document.addEventListener('keydown', (event) => {
        if (event.code === 'AltLeft') {
            document.exitPointerLock();
        }
    });

    document.addEventListener('click', () => {
        if (!mouseLocked) {
            canvas.requestPointerLock();
        }
    });

    requestAnimationFrame(drawScene);

    function drawScene(time) {
        webglUtils.resizeCanvasToDisplaySize(gl.canvas);

        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const projectionMatrix = mat4.perspective(mat4.create(), fieldOfViewRadians, aspect, 1, 2000);

        const forward = vec3.create();
        vec3.set(forward, Math.sin(yaw), 0, Math.cos(yaw));
        vec3.normalize(forward, forward);

        const right = vec3.create();
        vec3.set(right, Math.sin(yaw - Math.PI / 2), 0, Math.cos(yaw - Math.PI / 2));
        vec3.normalize(right, right);

        if (inputInstance.GetKeyDown('KeyW')) {
            vec3.scaleAndAdd(cameraPosition, cameraPosition, forward, cameraSpeed);
        }
        if (inputInstance.GetKeyDown('KeyS')) {
            vec3.scaleAndAdd(cameraPosition, cameraPosition, forward, -cameraSpeed);
        }
        if (inputInstance.GetKeyDown('KeyA')) {
            vec3.scaleAndAdd(cameraPosition, cameraPosition, right, -cameraSpeed);
        }
        if (inputInstance.GetKeyDown('KeyD')) {
            vec3.scaleAndAdd(cameraPosition, cameraPosition, right, cameraSpeed);
        }
        if (inputInstance.GetKeyDown('Space')) { // Spazio per muoversi in alto
            cameraPosition[1] = Math.max(cameraPosition[1] - verticalSpeed, -1.6);
        }
        if (inputInstance.GetKeyDown('ControlLeft')) { // Ctrl per muoversi in basso
            cameraPosition[1] = Math.min(cameraPosition[1] + verticalSpeed, -1.0);
        }

        // Limiti del movimento
        cameraPosition[0] = Math.max(Math.min(cameraPosition[0], 10), -10);
        cameraPosition[2] = Math.max(Math.min(cameraPosition[2], 10), -10);

        const target = vec3.create();
        vec3.add(target, cameraPosition, forward);

        const cameraMatrix = mat4.lookAt(mat4.create(), cameraPosition, target, up);
        mat4.rotateX(cameraMatrix, cameraMatrix, pitch); // Rotate pitch around X-axis

        const viewMatrix = mat4.invert(mat4.create(), cameraMatrix);
        const viewDirectionProjectionMatrix = mat4.multiply(mat4.create(), projectionMatrix, viewMatrix);
        const viewDirectionProjectionInverseMatrix = mat4.invert(mat4.create(), viewDirectionProjectionMatrix);

        // Disegna la skybox
        gl.useProgram(skyboxProgram);
        gl.depthFunc(gl.LEQUAL);

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.vertexAttribPointer(skyboxPositionLocation, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(skyboxPositionLocation);

        // FIXME: gl.uniformMatrix4fv(skyboxViewDirectionProjectionInverseLocation, false, viewDirectionProjectionInverseMatrix);
        gl.uniform1i(skyboxTextureLocation, 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTexture);

        gl.drawArrays(gl.TRIANGLES, 0, 36);

        // Disegna il pavimento e i muri
        gl.useProgram(program);

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(positionLocation);

        gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
        gl.vertexAttribPointer(texcoordLocation, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(texcoordLocation);

        gl.uniformMatrix4fv(matrixLocation, false, new Float32Array(viewDirectionProjectionMatrix));
        gl.uniform1i(textureLocation, 0);

        gl.bindTexture(gl.TEXTURE_2D, woodTexture);
        gl.drawArrays(gl.TRIANGLES, 0, 6); // Disegna il pavimento

        gl.bindTexture(gl.TEXTURE_2D, wallTexture);
        gl.drawArrays(gl.TRIANGLES, 6, 24); // Disegna i muri

        // Aggiornare le coordinate sullo schermo
        updateCoordinates(cameraPosition, yaw);

        requestAnimationFrame(drawScene);
    }

    function updateCoordinates(position, yaw) {
        const coordinates = document.getElementById("coordinates");
        coordinates.textContent = `X: ${position[0].toFixed(2)}, Y: ${position[1].toFixed(2)}, Z: ${position[2].toFixed(2)}, Yaw: ${(yaw * 180 / Math.PI).toFixed(2)}°`;
    }
}

function setFloorAndWallGeometry(gl) {
    var size = 10; // Raddoppia la dimensione del pavimento
    var height = -3; // Altezza dei muri invertita
    var positions = new Float32Array([
        // Pavimento
        -size, 0, -size,
         size, 0, -size,
        -size, 0,  size,
        -size, 0,  size,
         size, 0, -size,
         size, 0,  size,
        // Muro posteriore
        -size, 0, -size,
         size, 0, -size,
        -size, height, -size,
        -size, height, -size,
         size, 0, -size,
         size, height, -size,
        // Muro anteriore
        -size, 0,  size,
         size, 0,  size,
        -size, height,  size,
        -size, height,  size,
         size, 0,  size,
         size, height,  size,
        // Muro sinistro
        -size, 0, -size,
        -size, 0,  size,
        -size, height, -size,
        -size, height, -size,
        -size, 0,  size,
        -size, height,  size,
        // Muro destro
         size, 0, -size,
         size, 0,  size,
         size, height, -size,
         size, height, -size,
         size, 0,  size,
         size, height,  size,
        // Skybox
        -size * 5,  size * 5, -size * 5,
         size * 5,  size * 5, -size * 5,
        -size * 5, -size * 5, -size * 5,
        -size * 5, -size * 5, -size * 5,
         size * 5,  size * 5, -size * 5,
         size * 5, -size * 5, -size * 5,
        -size * 5,  size * 5,  size * 5,
         size * 5,  size * 5,  size * 5,
        -size * 5, -size * 5,  size * 5,
        -size * 5, -size * 5,  size * 5,
         size * 5,  size * 5,  size * 5,
         size * 5, -size * 5,  size * 5,
        -size * 5,  size * 5, -size * 5,
        -size * 5,  size * 5,  size * 5,
        -size * 5, -size * 5, -size * 5,
        -size * 5, -size * 5, -size * 5,
        -size * 5,  size * 5,  size * 5,
        -size * 5, -size * 5,  size * 5,
         size * 5,  size * 5, -size * 5,
         size * 5,  size * 5,  size * 5,
         size * 5, -size * 5, -size * 5,
         size * 5, -size * 5, -size * 5,
         size * 5,  size * 5,  size * 5,
         size * 5, -size * 5,  size * 5,
        -size * 5,  size * 5, -size * 5,
         size * 5,  size * 5, -size * 5,
        -size * 5,  size * 5,  size * 5,
        -size * 5,  size * 5,  size * 5,
         size * 5,  size * 5, -size * 5,
         size * 5,  size * 5,  size * 5,
        -size * 5, -size * 5, -size * 5,
         size * 5, -size * 5, -size * 5,
        -size * 5, -size * 5,  size * 5,
        -size * 5, -size * 5,  size * 5,
         size * 5, -size * 5, -size * 5,
         size * 5, -size * 5,  size * 5,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
}

function setFloorAndWallTexcoords(gl) {
    var texcoords = new Float32Array([
        // Pavimento
        0, 0,
        10, 0,
        0, 10,
        0, 10,
        10, 0,
        10, 10,
        // Muro posteriore
        0, 0,
        10, 0,
        0, 3,
        0, 3,
        10, 0,
        10, 3,
        // Muro anteriore
        0, 0,
        10, 0,
        0, 3,
        0, 3,
        10, 0,
        10, 3,
        // Muro sinistro
        0, 0,
        10, 0,
        0, 3,
        0, 3,
        10, 0,
        10, 3,
        // Muro destro
        0, 0,
        10, 0,
        0, 3,
        0, 3,
        10, 0,
        10, 3,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, texcoords, gl.STATIC_DRAW);
}

function degToRad(d) {
    return d * Math.PI / 180;
}

main();
