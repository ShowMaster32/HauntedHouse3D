"use strict";

function main() {
    var canvas = document.querySelector("#canvas");
    var gl = canvas.getContext("webgl");
    if (!gl) {
        console.error("WebGL not supported");
        return;
    }

    var program = webglUtils.createProgramFromScripts(gl, ["vertex-shader-3d", "fragment-shader-3d"]);

    var positionLocation = gl.getAttribLocation(program, "a_position");

    var skyboxLocation = gl.getUniformLocation(program, "u_skybox");
    var viewDirectionProjectionInverseLocation = gl.getUniformLocation(program, "u_viewDirectionProjectionInverse");

    var positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    setGeometry(gl);

    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

    const faceInfos = [
        { target: gl.TEXTURE_CUBE_MAP_POSITIVE_X, url: 'textures/skybox/px.png' },
        { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X, url: 'textures/skybox/nx.png' },
        { target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y, url: 'textures/skybox/py.png' },
        { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, url: 'textures/skybox/ny.png' },
        { target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z, url: 'textures/skybox/pz.png' },
        { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, url: 'textures/skybox/nz.png' },
    ];
    faceInfos.forEach((faceInfo) => {
        const {target, url} = faceInfo;

        const level = 0;
        const internalFormat = gl.RGBA;
        const width = 1024; // Ingrandito
        const height = 1024; // Ingrandito
        const format = gl.RGBA;
        const type = gl.UNSIGNED_BYTE;

        gl.texImage2D(target, level, internalFormat, width, height, 0, format, type, null);

        const image = new Image();
        image.src = url;
        image.addEventListener('load', function() {
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
            gl.texImage2D(target, level, internalFormat, format, type, image);

            if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
                gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
            } else {
                gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            }
        });
        image.addEventListener('error', function() {
            console.error(`Failed to load image: ${url}`);
        });
    });

    function isPowerOf2(value) {
        return (value & (value - 1)) === 0;
    }

    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

    function radToDeg(r) {
        return r * 180 / Math.PI;
    }

    function degToRad(d) {
        return d * Math.PI / 180;
    }

    const fieldOfViewRadians = degToRad(60);
    const cameraPosition = [0, 0, 0];
    const cameraTarget = [0, 0, 0];
    const up = [0, 1, 0];
    const cameraSpeed = 0.02;
    const rotationSpeed = 0.005; 
    const keys = {};

    const limit = 5; // Limite di distanza dai bordi della skybox

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

        yaw -= deltaX * rotationSpeed; // Invert X axis
        pitch += deltaY * rotationSpeed;

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
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const projectionMatrix = mat4.perspective(mat4.create(), fieldOfViewRadians, aspect, 1, 2000);

        const forward = vec3.create();
        vec3.set(forward, Math.sin(yaw), 0, Math.cos(yaw));
        vec3.normalize(forward, forward);

        const right = vec3.create();
        vec3.set(right, Math.sin(yaw + Math.PI / 2), 0, Math.cos(yaw + Math.PI / 2));
        vec3.normalize(right, right);

        const newPosition = vec3.clone(cameraPosition);
        if (keys['w']) {
            vec3.scaleAndAdd(newPosition, newPosition, forward, cameraSpeed);
        }
        if (keys['s']) {
            vec3.scaleAndAdd(newPosition, newPosition, forward, -cameraSpeed);
        }
        if (keys['a']) {
            vec3.scaleAndAdd(newPosition, newPosition, right, -cameraSpeed);
        }
        if (keys['d']) {
            vec3.scaleAndAdd(newPosition, newPosition, right, cameraSpeed);
        }

        if (Math.abs(newPosition[0]) < limit && Math.abs(newPosition[1]) < limit && Math.abs(newPosition[2]) < limit) {
            vec3.copy(cameraPosition, newPosition);
        }

        const target = vec3.create();
        vec3.add(target, cameraPosition, forward);

        const cameraMatrix = mat4.lookAt(mat4.create(), cameraPosition, target, up);
        mat4.rotateX(cameraMatrix, cameraMatrix, pitch);

        const viewMatrix = mat4.invert(mat4.create(), cameraMatrix);
        const viewDirectionProjectionMatrix = mat4.multiply(mat4.create(), projectionMatrix, viewMatrix);
        const viewDirectionProjectionInverseMatrix = mat4.invert(mat4.create(), viewDirectionProjectionMatrix);

        gl.uniformMatrix4fv(viewDirectionProjectionInverseLocation, false, viewDirectionProjectionInverseMatrix);
        gl.uniform1i(skyboxLocation, 0);

        gl.depthFunc(gl.LEQUAL);
        gl.drawArrays(gl.TRIANGLES, 0, 1 * 6);

        requestAnimationFrame(drawScene);
    }
}

function setGeometry(gl) {
    const positions = new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
}

main();
