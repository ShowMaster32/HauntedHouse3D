"use strict";

function main() {
    var canvas = document.querySelector("#canvas");
    var gl = canvas.getContext("webgl");
    if (!gl) {
        console.error("WebGL not supported");
        return;
    }

    var program = webglUtils.createProgramFromScripts(gl, ["vertex-shader-3d", "fragment-shader-3d"]);
    if (!program) {
        console.error("Failed to create program");
        return;
    }
    console.log("Program created");

    var positionLocation = gl.getAttribLocation(program, "a_position");
    var texcoordLocation = gl.getAttribLocation(program, "a_texcoord");

    var matrixLocation = gl.getUniformLocation(program, "u_matrix");
    var textureLocation = gl.getUniformLocation(program, "u_texture");

    gl.useProgram(program);

    var positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    setFloorGeometry(gl);
    console.log("Geometry set");

    var texcoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    setFloorTexcoords(gl);
    console.log("Texcoords set");

    var woodTexture = gl.createTexture();
    var image = new Image();
    image.src = 'textures/wood.jpg'; // Percorso alla tua texture del pavimento in legno
    image.addEventListener('load', function() {
        gl.bindTexture(gl.TEXTURE_2D, woodTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
        console.log("Texture loaded");
    });

    const fieldOfViewRadians = degToRad(60);
    const cameraPosition = vec3.fromValues(0, 1.6, 0); // Altezza della telecamera all'altezza di una persona
    const up = vec3.fromValues(0, 1, 0); // Y positivo verso l'alto
    const cameraSpeed = 0.05;
    const rotationSpeed = 0.005;
    const verticalSpeed = 0.05;
    const keys = {};

    let mouseDown = false;
    let lastMouseX = null;
    let lastMouseY = null;
    let yaw = 0;
    let pitch = 0;

    window.addEventListener('keydown', (event) => keys[event.key] = true);
    window.addEventListener('keyup', (event) => keys[event.key] = false);

    canvas.addEventListener('mousedown', (event) => {
        mouseDown = true;
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    });

    canvas.addEventListener('mouseup', () => {
        mouseDown = false;
    });

    canvas.addEventListener('mousemove', (event) => {
        if (!mouseDown) return;

        const newX = event.clientX;
        const newY = event.clientY;

        const deltaX = newX - lastMouseX;
        const deltaY = newY - lastMouseY;

        yaw += deltaX * rotationSpeed; // Invertito l'asse X
        pitch -= deltaY * rotationSpeed; // Invertito l'asse Y

        // Limit pitch to avoid flipping
        pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));

        lastMouseX = newX;
        lastMouseY = newY;
    });

    requestAnimationFrame(drawScene);

    function drawScene(time) {
        webglUtils.resizeCanvasToDisplaySize(gl.canvas);

        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(program);

        gl.enableVertexAttribArray(positionLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

        gl.enableVertexAttribArray(texcoordLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
        gl.vertexAttribPointer(texcoordLocation, 2, gl.FLOAT, false, 0, 0);

        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const projectionMatrix = mat4.perspective(mat4.create(), fieldOfViewRadians, aspect, 1, 2000);

        const forward = vec3.create();
        vec3.set(forward, Math.sin(yaw), 0, Math.cos(yaw));
        vec3.normalize(forward, forward);

        const right = vec3.create();
        vec3.set(right, Math.sin(yaw + Math.PI / 2), 0, Math.cos(yaw + Math.PI / 2));
        vec3.normalize(right, right);

        if (keys['w']) {
            vec3.scaleAndAdd(cameraPosition, cameraPosition, forward, cameraSpeed);
        }
        if (keys['s']) {
            vec3.scaleAndAdd(cameraPosition, cameraPosition, forward, -cameraSpeed);
        }
        if (keys['a']) {
            yaw -= rotationSpeed; // Ruota a sinistra
        }
        if (keys['d']) {
            yaw += rotationSpeed; // Ruota a destra
        }
        if (keys[' ']) { // Spazio per muoversi in alto
            cameraPosition[1] += verticalSpeed;
        }
        if (keys['Control']) { // Ctrl per muoversi in basso
            cameraPosition[1] -= verticalSpeed;
        }

        const target = vec3.create();
        vec3.add(target, cameraPosition, forward);

        const cameraMatrix = mat4.lookAt(mat4.create(), cameraPosition, target, up);
        mat4.rotateX(cameraMatrix, cameraMatrix, pitch); // Rotate pitch around X-axis

        const viewMatrix = mat4.invert(mat4.create(), cameraMatrix);
        const viewDirectionProjectionMatrix = mat4.multiply(mat4.create(), projectionMatrix, viewMatrix);

        gl.uniformMatrix4fv(matrixLocation, false, viewDirectionProjectionMatrix);
        gl.uniform1i(textureLocation, 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, woodTexture);

        gl.depthFunc(gl.LEQUAL);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // Aggiornare le coordinate sullo schermo
        updateCoordinates(cameraPosition);

        requestAnimationFrame(drawScene);
    }

    function updateCoordinates(position) {
        const coordinates = document.getElementById("coordinates");
        coordinates.textContent = `X: ${position[0].toFixed(2)}, Y: ${position[1].toFixed(2)}, Z: ${position[2].toFixed(2)}`;
    }
}

function setFloorGeometry(gl) {
    var size = 5; // Dimensione del monolocale
    var positions = new Float32Array([
        -size, 0, -size,
         size, 0, -size,
        -size, 0,  size,
        -size, 0,  size,
         size, 0, -size,
         size, 0,  size,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
}

function setFloorTexcoords(gl) {
    var texcoords = new Float32Array([
        0, 0,
        5, 0,
        0, 5,
        0, 5,
        5, 0,
        5, 5,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, texcoords, gl.STATIC_DRAW);
}

function degToRad(d) {
    return d * Math.PI / 180;
}

main();
