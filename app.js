// Seleziona il canvas
const canvas = document.getElementById('webgl-canvas');
const gl = canvas.getContext('webgl');

// Imposta le dimensioni del canvas
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

if (!gl) {
    console.error('WebGL not supported');
} else {
    console.log('WebGL initialized successfully');
}

// Imposta il colore di sfondo
gl.clearColor(0.1, 0.1, 0.1, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);

// Funzione per ridimensionare il canvas e impostare la viewport correttamente
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
});
gl.viewport(0, 0, canvas.width, canvas.height);

// Funzioni per creare shader e programma
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation failed:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function createProgram(gl, vertexShaderSource, fragmentShaderSource) {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program linking failed:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }
    return program;
}

// Carica i shader dai file e crea il programma WebGL
async function loadShaderSource(url) {
    const response = await fetch(url);
    return response.text();
}

async function initShaders() {
    const vertexShaderSource = await loadShaderSource('shaders/vertexShader.glsl');
    const fragmentShaderSource = await loadShaderSource('shaders/fragmentShader.glsl');
    const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    if (!program) {
        console.error('Failed to initialize shaders.');
        return null;
    }
    return program;
}

// Carica e parsa il modello OBJ
function parseOBJ(text) {
    const positions = [];
    const normals = [];
    const vertexData = [positions, normals];

    const keywords = {
        v(parts) {
            positions.push(parts.map(parseFloat));
        },
        vn(parts) {
            normals.push(parts.map(parseFloat));
        },
        f(parts) {
            const numVertices = parts.length;
            for (let i = 0; i < numVertices; i++) {
                const indices = parts[i].split('/');
                for (let j = 0; j < indices.length; j++) {
                    const index = parseInt(indices[j], 10);
                    if (!vertexData[j]) continue;
                    vertexData[j].push(vertexData[j][index - 1]);
                }
            }
        },
    };

    const lines = text.split('\n');
    for (let line of lines) {
        const parts = line.trim().split(/\s+/);
        const keyword = parts.shift();
        if (keyword in keywords) {
            keywords[keyword](parts);
        }
    }

    return {
        positions: new Float32Array(positions.flat()),
        normals: new Float32Array(normals.flat()),
    };
}

// Variabili per la rotazione della vista
let mouseDown = false;
let lastMouseX = null;
let lastMouseY = null;
let rotationMatrix = mat4.create();
let modelViewMatrix = mat4.create();
let cameraMatrix = mat4.create();
let cameraPosition = [0, 0, 5];
let cameraTarget = [0, 0, 0];
let up = [0, 1, 0];
let keys = {};

mat4.identity(rotationMatrix);
mat4.identity(modelViewMatrix);
mat4.lookAt(cameraMatrix, cameraPosition, cameraTarget, up);

// Funzione per gestire il mouse down
canvas.addEventListener('mousedown', (event) => {
    mouseDown = true;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
});

// Funzione per gestire il mouse up
canvas.addEventListener('mouseup', () => {
    mouseDown = false;
});

// Funzione per gestire il mouse move
canvas.addEventListener('mousemove', (event) => {
    if (!mouseDown) {
        return;
    }
    const newX = event.clientX;
    const newY = event.clientY;

    const deltaX = newX - lastMouseX;
    const deltaY = newY - lastMouseY;

    const newRotationMatrix = mat4.create();
    mat4.identity(newRotationMatrix);

    mat4.rotate(newRotationMatrix, newRotationMatrix, degToRad(deltaX / 10), [0, 1, 0]); // riduci la sensibilità
    mat4.rotate(newRotationMatrix, newRotationMatrix, degToRad(deltaY / 10), [1, 0, 0]); // riduci la sensibilità

    mat4.multiply(rotationMatrix, newRotationMatrix, rotationMatrix);

    lastMouseX = newX;
    lastMouseY = newY;

    // Applica la rotazione alla matrice di vista
    mat4.identity(modelViewMatrix);
    mat4.translate(modelViewMatrix, modelViewMatrix, [0, 0, -5]);
    mat4.multiply(modelViewMatrix, modelViewMatrix, rotationMatrix);
});

// Funzione di utilità per convertire gradi in radianti
function degToRad(degrees) {
    return degrees * Math.PI / 180;
}

// Funzione per gestire i tasti WASD
window.addEventListener('keydown', (event) => {
    keys[event.key] = true;
});

window.addEventListener('keyup', (event) => {
    keys[event.key] = false;
});

function updateCamera() {
    const speed = 0.1;
    if (keys['w']) {
        cameraPosition[2] -= speed;
    }
    if (keys['s']) {
        cameraPosition[2] += speed;
    }
    if (keys['a']) {
        cameraPosition[0] -= speed;
    }
    if (keys['d']) {
        cameraPosition[0] += speed;
    }
    mat4.lookAt(cameraMatrix, cameraPosition, cameraTarget, up);
}

// Caricamento del Modello e Rendering
async function loadModel(url) {
    const response = await fetch(url);
    const text = await response.text();
    return parseOBJ(text);
}

async function main() {
    const program = await initShaders();
    if (!program) return;

    const statueModel = await loadModel('models/haunted_statue.obj');
    const houseModel = await loadModel('models/haunted_house.obj');

    const statuePositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, statuePositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, statueModel.positions, gl.STATIC_DRAW);

    const statueNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, statueNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, statueModel.normals, gl.STATIC_DRAW);

    const housePositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, housePositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, houseModel.positions, gl.STATIC_DRAW);

    const houseNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, houseNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, houseModel.normals, gl.STATIC_DRAW);

    const aPosition = gl.getAttribLocation(program, 'aPosition');
    const aNormal = gl.getAttribLocation(program, 'aNormal');

    gl.useProgram(program);

    const uModelViewMatrix = gl.getUniformLocation(program, 'uModelViewMatrix');
    const uProjectionMatrix = gl.getUniformLocation(program, 'uProjectionMatrix');
    const uNormalMatrix = gl.getUniformLocation(program, 'uNormalMatrix');
    const uLightPosition = gl.getUniformLocation(program, 'uLightPosition');
    const uLightColor = gl.getUniformLocation(program, 'uLightColor');
    const uAmbientColor = gl.getUniformLocation(program, 'uAmbientColor');

    const projectionMatrix = mat4.create();
    const normalMatrix = mat3.create();

    mat4.perspective(projectionMatrix, Math.PI / 4, canvas.width / canvas.height, 0.1, 1000);

    function drawScene() {
        updateCamera();

        mat4.identity(modelViewMatrix);
        mat4.multiply(modelViewMatrix, cameraMatrix, rotationMatrix);

        mat3.normalFromMat4(normalMatrix, modelViewMatrix);

        gl.uniformMatrix4fv(uModelViewMatrix, false, modelViewMatrix);
        gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);
        gl.uniformMatrix3fv(uNormalMatrix, false, normalMatrix);
        gl.uniform3fv(uLightPosition, [1, 1, 1]);
        gl.uniform3fv(uLightColor, [1, 1, 1]);
        gl.uniform3fv(uAmbientColor, [0.2, 0.2, 0.2]);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);

        // Disegna la casa
        gl.bindBuffer(gl.ARRAY_BUFFER, housePositionBuffer);
        gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(aPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, houseNormalBuffer);
        gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(aNormal);

        gl.drawArrays(gl.TRIANGLES, 0, houseModel.positions.length / 3);

        // Disegna la statua
        gl.bindBuffer(gl.ARRAY_BUFFER, statuePositionBuffer);
        gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(aPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, statueNormalBuffer);
        gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(aNormal);

        gl.drawArrays(gl.TRIANGLES, 0, statueModel.positions.length / 3);

        requestAnimationFrame(drawScene);
    }

    drawScene();
}

main();
