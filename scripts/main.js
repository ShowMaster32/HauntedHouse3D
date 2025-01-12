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

/**
 * Disegna la scena.
 * @param {WebGLRenderingContext} gl - Contesto WebGL.
 * @param {Object} programInfo - Informazioni sul programma shader.
 * @param {Object} roomElements - Elementi della stanza.
 */
function drawScene(gl, programInfo, roomElements) {
    console.log("[Main] Disegnando la scena...");
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    roomElements.walls.forEach((wall) => {
        const modelViewMatrix = mat4.create();
        mat4.translate(modelViewMatrix, mat4.create(), [0, 0, -5]); // Modifica la posizione se necessario
        drawWall(gl, programInfo, wall, modelViewMatrix);
    });
}

/**
 * Avvia il gioco.
 */
function startGame() {
    console.log("[Main] Avvio del gioco...");
    document.getElementById('start-menu').style.display = 'none';
    document.getElementById('canvas').style.display = 'block';

    const introMusic = document.getElementById('intro-music');
    if (!gameStarted) {
        introMusic.play().catch((error) => console.error('[Main] Errore riproduzione audio:', error));
        gameStarted = true;
    }

    main();
}

/**
 * Funzione principale del gioco.
 */
function main() {
    console.log("[Main] Inizializzazione del gioco...");

    controls.init();

    const { gl: glContext, canvas } = initializeEnvironment('canvas');
    gl = glContext;

    const program = initializeShaders(gl);
    gl.useProgram(program);

    camera = {
        position: new Vector3(0, 1.8, 0),
        getWorldDirection: (direction) => {
            direction.x = 0;
            direction.y = 0;
            direction.z = -1;
        },
        up: { x: 0, y: 1, z: 0 },
    };

    const roomElements = loadModels(gl);
    console.log("[Main] Elementi della stanza caricati:", roomElements);

    const player = new Player(camera);

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

    let lastFrameTime = 0;

    function gameLoop(currentTime) {
        const deltaTime = (currentTime - lastFrameTime) / 1000;
        lastFrameTime = currentTime;

        console.log(`[Main] DeltaTime: ${deltaTime.toFixed(4)}s`);

        player.update(deltaTime, [
            ...roomElements.walls.map((wall) => wall.collision).filter(collision => collision && collision.position && collision.radius),
            roomElements.floor.collision,
            roomElements.ceiling.collision,
        ]);

        drawScene(gl, programInfo, roomElements);

        requestAnimationFrame(gameLoop);
    }

    gameLoop(0);
}

/**
 * Inizializza gli shader.
 * @param {WebGLRenderingContext} gl - Contesto WebGL.
 * @returns {WebGLProgram} - Programma shader.
 */
function initializeShaders(gl) {
    console.log("[Main] Inizializzazione degli shader...");

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

    console.log("[Main] Shader inizializzati correttamente.");
    return program;
}

/**
 * Crea uno shader.
 * @param {WebGLRenderingContext} gl - Contesto WebGL.
 * @param {number} type - Tipo di shader.
 * @param {string} source - Codice sorgente dello shader.
 * @returns {WebGLShader} - Shader compilato.
 */
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('[Main] Errore nella compilazione dello shader:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    console.log(`[Main] Shader compilato correttamente: ${type}`);
    return shader;
}

/**
 * Crea un programma shader.
 * @param {WebGLRenderingContext} gl - Contesto WebGL.
 * @param {WebGLShader} vertexShader - Shader dei vertici.
 * @param {WebGLShader} fragmentShader - Shader dei frammenti.
 * @returns {WebGLProgram} - Programma shader.
 */
function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('[Main] Errore nel collegamento del programma:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }

    console.log("[Main] Programma shader collegato correttamente.");
    return program;
}

// Aggiungi evento per il pulsante "START"
document.getElementById('start-button').addEventListener('click', startGame);
console.log("[Main] Modulo main.js caricato correttamente.");
