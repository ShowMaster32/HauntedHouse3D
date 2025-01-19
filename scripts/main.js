// main.js
import { initializeEnvironment, createRoom, drawRoom } from './environment.js';
import { Lighting } from './lighting.js';
import { Player } from './player.js';
import { Vector3 } from './math.js';
import { Shaders } from './shaders.js';
import { audioManager } from './audio.js';

let gl;
let canvas;
let programInfo;
let player;
let lastFrameTime = 0;
let isGameStarted = false;
let pointLight;
let roomElements;
let m4 = window.m4;  // Usa m4 invece di mat4

function initialize() {
    const env = initializeEnvironment('canvas');
    if (!env) {
        console.error('Impossibile inizializzare WebGL');
        return false;
    }
    gl = env.gl;
    canvas = env.canvas;

    const shaderProgram = Shaders.initShaderProgram(gl);
    if (!shaderProgram) {
        console.error('Impossibile inizializzare gli shader');
        return false;
    }

    // Aggiorna i nomi degli attributi per corrispondere agli shader
    programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
            normal: gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
            normalMatrix: gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),
            sampler: gl.getUniformLocation(shaderProgram, 'uSampler'),
            lightPosition: gl.getUniformLocation(shaderProgram, 'uLightPosition'),
            lightColor: gl.getUniformLocation(shaderProgram, 'uLightColor'),
            lightEnabled: gl.getUniformLocation(shaderProgram, 'uLightEnabled'),
            ambientStrength: gl.getUniformLocation(shaderProgram, 'uAmbientStrength')
        }
    };

    // Crea la stanza
    roomElements = createRoom(gl);
    if (!roomElements) {
        console.error('Impossibile creare gli elementi della stanza');
        return false;
    }

    // Inizializza il player
    player = new Player(new Vector3(0, 1.8, 0));
    
    // Crea la luce principale
    pointLight = Lighting.createPointLight(gl, [0, 8, 0], [1.0, 0.95, 0.8]);

    // Imposta valori iniziali per gli uniform della luce
    gl.useProgram(programInfo.program);
    gl.uniform1f(programInfo.uniformLocations.ambientStrength, 0.3);
    gl.uniform1i(programInfo.uniformLocations.lightEnabled, 1);

    initializeAudioEvents();
    return true;
}

function gameLoop(currentTime) {
    if (!isGameStarted) return;

    const deltaTime = Math.min((currentTime - lastFrameTime) / 1000.0, 0.1); // Limita deltaTime
    lastFrameTime = currentTime;

    player.update(deltaTime);
    updatePointLight();
    render();

    requestAnimationFrame(gameLoop);
}

function updatePointLight() {
    if (!pointLight || !programInfo) return;

    pointLight.position.x = player.position.x;
    pointLight.position.y = player.position.y + 3;
    pointLight.position.z = player.position.z;

    gl.useProgram(programInfo.program);
    gl.uniform3fv(programInfo.uniformLocations.lightPosition, pointLight.position.toArray());
    gl.uniform3fv(programInfo.uniformLocations.lightColor, pointLight.color.toArray());
}

function render() {
    if (!gl || !programInfo || !roomElements) return;

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const fieldOfView = 45 * Math.PI / 180;

    const projectionMatrix = m4.perspective(
        fieldOfView,
        aspect,
        0.1,
        100.0
    );

    const cameraPosition = player.position.toArray();
    const target = [
        cameraPosition[0] + Math.sin(player.rotation.y),
        cameraPosition[1] + Math.sin(player.rotation.x),
        cameraPosition[2] + Math.cos(player.rotation.y)
    ];
    const up = [0, 1, 0];

    const viewMatrix = m4.lookAt(cameraPosition, target, up);

    // Calcola e imposta la matrice normale
    const normalMatrix = m4.transpose(m4.inverse(viewMatrix));
    gl.uniformMatrix4fv(programInfo.uniformLocations.normalMatrix, false, normalMatrix);

    drawRoom(gl, programInfo, roomElements, viewMatrix, projectionMatrix);
}

// Gestisce l'avvio del gioco
function startGame() {
    if (!initialize()) {
        return;
    }

    // Nascondi il menu e mostra il gioco
    document.getElementById('start-menu').style.display = 'none';
    canvas.style.display = 'block';
    document.getElementById('top-bar').style.display = 'flex';
    document.getElementById('crosshair').style.display = 'block';

    // Avvia la musica di gioco
    audioManager.stopSound('introMusic');
    audioManager.playSound('startMusic');
    audioManager.playRandomGhostSound();

    // Blocca il puntatore
    canvas.requestPointerLock();

    // Avvia il game loop
    isGameStarted = true;
    lastFrameTime = performance.now();
    requestAnimationFrame(gameLoop);
}

// Gestisce gli eventi audio
function initializeAudioEvents() {
    // Avvia la musica dell'intro al caricamento
    window.addEventListener('load', () => {
        audioManager.playSound('introMusic', { loop: true });
    });
}

// Gestione eventi resize
function onWindowResize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
}

// Inizializza gli event listener
function initEventListeners() {
    window.addEventListener('resize', onWindowResize);
    document.getElementById('start-button').addEventListener('click', startGame);
    
    // Gestione Pointer Lock
    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === canvas) {
            document.body.style.cursor = 'none';
        } else {
            document.body.style.cursor = 'auto';
        }
    });
}

// Avvia l'inizializzazione degli eventi
initEventListeners();