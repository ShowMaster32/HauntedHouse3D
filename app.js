"use strict";

function main() {
    // Get A WebGL context
    /** @type {HTMLCanvasElement} */
    var canvas = document.querySelector("#canvas");
    var gl = canvas.getContext("webgl");
    if (!gl) {
        console.error("WebGL not supported");
        return;
    }

    // setup GLSL program
    var program = webglUtils.createProgramFromScripts(gl, ["vertex-shader-3d", "fragment-shader-3d"]);

    // look up where the vertex data needs to go.
    var positionLocation = gl.getAttribLocation(program, "a_position");

    // lookup uniforms
    var skyboxLocation = gl.getUniformLocation(program, "u_skybox");
    var viewDirectionProjectionInverseLocation = gl.getUniformLocation(program, "u_viewDirectionProjectionInverse");

    // Create a buffer for positions
    var positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    setGeometry(gl);

    // Create a texture.
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
        const width = 512;
        const height = 512;
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
    const cameraPosition = [0, 0, 2];
    const cameraTarget = [0, 0, 0];
    const up = [0, 1, 0];
    const cameraSpeed = 0.05;
    const keys = {};

    window.addEventListener('keydown', (event) => keys[event.key] = true);
    window.addEventListener('keyup', (event) => keys[event.key] = false);

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
        const projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, 1, 2000);

        if (keys['w']) {
            cameraPosition[2] -= cameraSpeed;
        }
        if (keys['s']) {
            cameraPosition[2] += cameraSpeed;
        }
        if (keys['a']) {
            cameraPosition[0] -= cameraSpeed;
        }
        if (keys['d']) {
            cameraPosition[0] += cameraSpeed;
        }

        const cameraMatrix = m4.lookAt(cameraPosition, cameraTarget, up);
        const viewMatrix = m4.inverse(cameraMatrix);
        const viewDirectionProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);
        const viewDirectionProjectionInverseMatrix = m4.inverse(viewDirectionProjectionMatrix);

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
