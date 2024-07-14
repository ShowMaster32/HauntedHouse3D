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
    setFloorAndWallGeometry(gl);
    console.log("Geometry set");

    var texcoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    setFloorAndWallTexcoords(gl);
    console.log("Texcoords set");

    var woodTexture = gl.createTexture();
    var wallTexture = gl.createTexture();

    var floorImage = new Image();
    floorImage.src = 'textures/wood.jpg'; // Percorso alla tua texture del pavimento in legno
    floorImage.addEventListener('load', function() {
        gl.bindTexture(gl.TEXTURE_2D, woodTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, floorImage);
        gl.generateMipmap(gl.TEXTURE_2D);
        console.log("Floor texture loaded");
    });

    var wallImage = new Image();
    wallImage.src = 'textures/wall.jpg'; // Percorso alla tua texture del muro
    wallImage.addEventListener('load', function() {
        gl.bindTexture(gl.TEXTURE_2D, wallTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, wallImage);
        gl.generateMipmap(gl.TEXTURE_2D);
        console.log("Wall texture loaded");
    });

    const fieldOfViewRadians = degToRad(60);
    const cameraPosition = vec3.fromValues(0, -1.6, 0); // Altezza della telecamera all'altezza di una persona
    const up = vec3.fromValues(0, -1, 0); // Invertiamo l'asse Y
    const cameraSpeed = 0.05;
    const rotationSpeed = 0.01;
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

        yaw -= deltaX * rotationSpeed; // Invertito l'asse X
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
        vec3.set(right, Math.sin(yaw - Math.PI / 2), 0, Math.cos(yaw - Math.PI / 2));
        vec3.normalize(right, right);

        if (keys['w']) {
            vec3.scaleAndAdd(cameraPosition, cameraPosition, forward, cameraSpeed);
        }
        if (keys['s']) {
            vec3.scaleAndAdd(cameraPosition, cameraPosition, forward, -cameraSpeed);
        }
        if (keys['a']) {
            vec3.scaleAndAdd(cameraPosition, cameraPosition, right, cameraSpeed);
        }
        if (keys['d']) {
            vec3.scaleAndAdd(cameraPosition, cameraPosition, right, -cameraSpeed);
        }
        if (keys[' ']) { // Spazio per muoversi in alto
            cameraPosition[1] = Math.max(cameraPosition[1] - verticalSpeed, -1.6);
        }
        if (keys['Control']) { // Ctrl per muoversi in basso
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

        gl.uniformMatrix4fv(matrixLocation, false, viewDirectionProjectionMatrix);
        gl.uniform1i(textureLocation, 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, woodTexture);

        gl.depthFunc(gl.LEQUAL);
        gl.drawArrays(gl.TRIANGLES, 0, 6); // Disegna il pavimento

        gl.bindTexture(gl.TEXTURE_2D, wallTexture);
        gl.drawArrays(gl.TRIANGLES, 6, 24); // Disegna i muri

        // Aggiornare le coordinate sullo schermo
        updateCoordinates(cameraPosition);

        requestAnimationFrame(drawScene);
    }

    function updateCoordinates(position) {
        const coordinates = document.getElementById("coordinates");
        coordinates.textContent = `X: ${position[0].toFixed(2)}, Y: ${position[1].toFixed(2)}, Z: ${position[2].toFixed(2)}`;
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
