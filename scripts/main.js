// main.js
import { initializeEnvironment, createRoom, drawRoom, ROOM_DEPTH } from './environment.js';
import { drawWall, drawFloor } from './models.js';
import { Lighting } from './lighting.js';
import { Player, PLAYER_CONSTANTS } from './player.js';
import { Vector3 } from './math.js';
import { Shaders } from './shaders.js';
import { audioManager } from './audio.js';
import { createSkybox } from './skybox.js';

let gl;
let canvas;
let programInfo;
let player;
let lastFrameTime = 0;
let isGameStarted = false;
let pointLight;
let roomElements;
let m4 = window.m4;
let skybox;

function initialize() {
    const env = initializeEnvironment('canvas');
    if (!env) {
        console.error('Impossibile inizializzare WebGL');
        return false;
    }
    console.log('Ambiente WebGL inizializzato:', env);

    gl = env.gl;
    canvas = env.canvas;

    const shaderProgram = Shaders.initShaderProgram(gl);
    if (!shaderProgram) {
        console.error('Impossibile inizializzare gli shader');
        return false;
    }
    console.log('Shader program creato:', shaderProgram);

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

    console.log('Program info creato:', programInfo);

    roomElements = createRoom(gl);
    if (!roomElements) {
        console.error('Impossibile creare gli elementi della stanza');
        return false;
    }
    console.log('Elementi della stanza creati:', roomElements);

    player = new Player(new Vector3(0, PLAYER_CONSTANTS.PLAYER_HEIGHT, ROOM_DEPTH/4));
    console.log('Player inizializzato:', player);

    pointLight = Lighting.createPointLight(gl, [0, 8, 0], [1.0, 0.95, 0.8]);
    console.log('Luce creata:', pointLight);

    // Inizializza la skybox
    skybox = createSkybox(gl);
    console.log('Skybox creata:', skybox);

    gl.useProgram(programInfo.program);
    gl.uniform1f(programInfo.uniformLocations.ambientStrength, 0.3);
    gl.uniform1i(programInfo.uniformLocations.lightEnabled, 1);

    // Verifica lo stato di WebGL
    const error = gl.getError();
    if (error !== gl.NO_ERROR) {
        console.error('Errore WebGL durante l\'inizializzazione:', error);
        return false;
    }

    // Verifica che tutti i buffer siano stati creati correttamente
    console.log('Stato dei buffer:', {
        walls: roomElements.walls.map(wall => ({
            hasPosition: !!wall.mesh.position,
            hasTexcoord: !!wall.mesh.texcoord,
            hasNormal: !!wall.mesh.normal,
            hasIndices: !!wall.mesh.indices
        })),
        floor: roomElements.floor ? {
            hasPosition: !!roomElements.floor.mesh.position,
            hasTexcoord: !!roomElements.floor.mesh.texcoord,
            hasNormal: !!roomElements.floor.mesh.normal,
            hasIndices: !!roomElements.floor.mesh.indices
        } : null,
        ceiling: roomElements.ceiling ? {
            hasPosition: !!roomElements.ceiling.mesh.position,
            hasTexcoord: !!roomElements.ceiling.mesh.texcoord,
            hasNormal: !!roomElements.ceiling.mesh.normal,
            hasIndices: !!roomElements.ceiling.mesh.indices
        } : null
    });

    initializeAudioEvents();
    initEventListeners();

    console.log('Inizializzazione completata con successo');
    return true;
}

function gameLoop(currentTime) {
    if (!isGameStarted) return;
    
    const deltaTime = Math.min((currentTime - lastFrameTime) / 1000.0, 0.1);
    lastFrameTime = currentTime;
    
    const collisionObjects = roomElements.walls.concat([roomElements.floor, roomElements.ceiling]);
    player.update(deltaTime, collisionObjects);
    
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
    if (!gl || !programInfo || !roomElements) {
        console.warn('Mancano componenti necessari per il rendering:', {
            gl: !!gl,
            programInfo: !!programInfo,
            roomElements: !!roomElements
        });
        return;
    }

    // Setup base di WebGL
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.frontFace(gl.CCW);   // Counter-clockwise è il fronte
    gl.cullFace(gl.BACK);   // Cull i back faces

    // Setup delle matrici di proiezione
    const fieldOfView = 60 * Math.PI / 180;
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projectionMatrix = m4.perspective(fieldOfView, aspect, 0.1, 100.0);

    // Posizione e target della camera
    const cameraPosition = [
        player.position.x,
        player.position.y + PLAYER_CONSTANTS.EYE_HEIGHT,
        player.position.z
    ];

    const lookDistance = 1.0;
    const target = [
        cameraPosition[0] + Math.sin(player.rotation.y) * lookDistance,
        cameraPosition[1] + Math.sin(player.rotation.x) * lookDistance,
        cameraPosition[2] + Math.cos(player.rotation.y) * lookDistance
    ];

    const viewMatrix = m4.lookAt(cameraPosition, target, [0, 1, 0]);

    // Rendering della skybox
    if (skybox) {
        const skyboxViewMatrix = m4.copy(viewMatrix);
        skyboxViewMatrix[12] = 0;
        skyboxViewMatrix[13] = 0;
        skyboxViewMatrix[14] = 0;
        skybox.draw(gl, programInfo, skyboxViewMatrix, projectionMatrix);
    }

    // Setup del programma shader principale
    gl.useProgram(programInfo.program);
    
    // Setup illuminazione
    gl.uniform1f(programInfo.uniformLocations.ambientStrength, 0.6);  // Aumentato da 0.5
    gl.uniform3fv(programInfo.uniformLocations.lightPosition, [
        player.position.x,
        player.position.y + 2.0,
        player.position.z
    ]);
    gl.uniform3fv(programInfo.uniformLocations.lightColor, [1.0, 1.0, 1.0]);
    gl.uniform1i(programInfo.uniformLocations.lightEnabled, 1);

    // Rendering delle pareti
    roomElements.walls.forEach(wall => {
        const modelMatrix = createModelMatrix(wall.position, wall.rotation);
        const modelViewMatrix = m4.multiply(viewMatrix, modelMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
        
        const normalMatrix = m4.transpose(m4.inverse(modelViewMatrix));
        gl.uniformMatrix4fv(programInfo.uniformLocations.normalMatrix, false, normalMatrix);
        
        gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
        drawWall(gl, programInfo, wall.mesh, modelViewMatrix);
    });

    // Rendering del pavimento
    if (roomElements.floor) {
        const floorModelMatrix = createModelMatrix(roomElements.floor.position, roomElements.floor.rotation);
        const floorModelViewMatrix = m4.multiply(viewMatrix, floorModelMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, floorModelViewMatrix);
        
        const floorNormalMatrix = m4.transpose(m4.inverse(floorModelViewMatrix));
        gl.uniformMatrix4fv(programInfo.uniformLocations.normalMatrix, false, floorNormalMatrix);
        
        drawFloor(gl, programInfo, roomElements.floor.mesh, floorModelViewMatrix);
    }

    // Rendering del soffitto
    if (roomElements.ceiling) {
        const ceilingModelMatrix = createModelMatrix(roomElements.ceiling.position, roomElements.ceiling.rotation);
        const ceilingModelViewMatrix = m4.multiply(viewMatrix, ceilingModelMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, ceilingModelViewMatrix);
        
        const ceilingNormalMatrix = m4.transpose(m4.inverse(ceilingModelViewMatrix));
        gl.uniformMatrix4fv(programInfo.uniformLocations.normalMatrix, false, ceilingNormalMatrix);
        
        drawFloor(gl, programInfo, roomElements.ceiling.mesh, ceilingModelViewMatrix);
    }

    // Verifica errori WebGL
    const error = gl.getError();
    if (error !== gl.NO_ERROR) {
        console.error('WebGL error:', error);
    }
}

function createModelMatrix(position, rotation) {
    let matrix = m4.identity();
    matrix = m4.translate(matrix, position.x, position.y, position.z);
    matrix = m4.xRotate(matrix, rotation.x);
    matrix = m4.yRotate(matrix, rotation.y);
    matrix = m4.zRotate(matrix, rotation.z);
    return matrix;
}

function startGame() {
    if (!initialize()) return;
    
    document.getElementById('start-menu').style.display = 'none';
    canvas.style.display = 'block';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    document.getElementById('top-bar').style.display = 'flex';
    document.getElementById('crosshair').style.display = 'block';
    
    audioManager.stopSound('introMusic');
    audioManager.playSound('startMusic');
    audioManager.playRandomGhostSound();
    
    canvas.requestPointerLock();
    
    isGameStarted = true;
    lastFrameTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function initializeAudioEvents() {
    window.addEventListener('load', () => {
        audioManager.playSound('introMusic', { loop: true });
    });
}

function onWindowResize() {
    if (canvas && gl) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
}

function initEventListeners() {
    window.addEventListener('resize', onWindowResize);
    document.getElementById('start-button').addEventListener('click', startGame);
    
    document.addEventListener('pointerlockchange', () => {
        document.body.style.cursor = document.pointerLockElement === canvas ? 'none' : 'auto';
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.code === 'KeyP') {
            document.getElementById('control-panel').classList.toggle('hidden');
        }
    });
}

initEventListeners();