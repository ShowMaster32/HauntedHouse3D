import { initializeEnvironment } from './environment.js';
import { loadModels } from './models.js';
import { Player } from './player.js';
import { controls } from './player.js';
import { Vector3 } from './math.js';
import { drawWall } from './models.js';
const { mat4 } = glMatrix;

let gl;
let camera;
let gameStarted = false;

function drawScene(gl, programInfo, roomElements) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    roomElements.walls.forEach((wall) => {
        const modelViewMatrix = mat4.create();
        mat4.translate(modelViewMatrix, mat4.create(), [0, 0, -5]); // Modifica la posizione se necessario
        drawWall(gl, programInfo, wall, modelViewMatrix);
    });
}

function startGame() {
    // Nascondi il menu iniziale e mostra il canvas
    document.getElementById('start-menu').style.display = 'none';
    document.getElementById('canvas').style.display = 'block';

    // Avvia l'audio iniziale solo una volta
    const introMusic = document.getElementById('intro-music');
    if (!gameStarted) {
        introMusic.play().catch((error) => console.error('Errore riproduzione audio:', error));
        gameStarted = true;
    }

    main();
}

function main() {
    // Inizializza i controlli
    controls.init();

    // Inizializza l'ambiente e il contesto WebGL
    const { gl: glContext, canvas } = initializeEnvironment('canvas');
    gl = glContext;

    // Compila e collega gli shader
    const program = initializeShaders(gl);
    gl.useProgram(program);

    // Crea una camera fittizia
    camera = {
        position: new Vector3(0, 1.8, 0), // Posizione iniziale
        getWorldDirection: (direction) => {
            direction.x = 0;
            direction.y = 0;
            direction.z = -1;
        },
        up: { x: 0, y: 1, z: 0 },
    };

    // Carica i modelli
    const roomElements = loadModels(gl);

    // Inizializza il player
    const player = new Player(camera);

    // Informazioni sul programma shader
    const programInfo = {
        attribLocations: {
            aPosition: gl.getAttribLocation(program, 'aPosition'),
            aTexCoord: gl.getAttribLocation(program, 'aTexCoord'),
        },
        uniformLocations: {
            uModelViewMatrix: gl.getUniformLocation(program, 'uModelViewMatrix'),
            uProjectionMatrix: gl.getUniformLocation(program, 'uProjectionMatrix'),
            uTexture: gl.getUniformLocation(program, 'uTexture'),
        },
    };

    // Variabile per calcolare il deltaTime
    let lastFrameTime = 0;

    // Loop di gioco
    function gameLoop(currentTime) {
        const deltaTime = (currentTime - lastFrameTime) / 1000; // Converte in secondi
        lastFrameTime = currentTime;

        // Aggiorna lo stato del player e disegna la scena
        player.update(deltaTime, roomElements.walls);
        drawScene(gl, programInfo, roomElements);

        requestAnimationFrame(gameLoop);
    }

    gameLoop(0);
}

// Inizializza gli shader
function initializeShaders(gl) {
    const vertexShaderSource = `
        attribute vec3 aPosition;
        attribute vec2 aTexCoord;

        uniform mat4 uModelViewMatrix;
        uniform mat4 uProjectionMatrix;

        varying vec2 vTexCoord;

        void main() {
            gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);
            vTexCoord = aTexCoord;
        }
    `;

    const fragmentShaderSource = `
        precision mediump float;

        varying vec2 vTexCoord;

        uniform sampler2D uTexture;

        void main() {
            gl_FragColor = texture2D(uTexture, vTexCoord);
        }
    `;

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = createProgram(gl, vertexShader, fragmentShader);

    return program;
}

// Funzione per creare uno shader
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Errore nella compilazione dello shader:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

// Funzione per creare un programma shader
function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Errore nel collegamento del programma:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }

    return program;
}

// Aggiungi evento per il pulsante "START"
document.getElementById('start-button').addEventListener('click', startGame);
