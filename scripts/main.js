// main.js
import { initializeEnvironment, createRoom, drawRoom, ROOM_DEPTH } from './environment.js';
import { drawWall, drawFloor } from './models.js';
import { Lighting } from './lighting.js';
import { Player, PLAYER_CONSTANTS } from './player.js';
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
let m4 = window.m4;

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

   roomElements = createRoom(gl);
   if (!roomElements) {
       console.error('Impossibile creare gli elementi della stanza');
       return false;
   }

   player = new Player(new Vector3(0, PLAYER_CONSTANTS.PLAYER_HEIGHT, ROOM_DEPTH/4));
   pointLight = Lighting.createPointLight(gl, [0, 8, 0], [1.0, 0.95, 0.8]);

   gl.useProgram(programInfo.program);
   gl.uniform1f(programInfo.uniformLocations.ambientStrength, 0.3);
   gl.uniform1i(programInfo.uniformLocations.lightEnabled, 1);

   initializeAudioEvents();
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
    if (!gl || !programInfo || !roomElements) return;
    
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    const fieldOfView = 60 * Math.PI / 180;
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projectionMatrix = m4.perspective(fieldOfView, aspect, 0.1, 100.0);
    
    const cameraPosition = [
        player.position.x,
        player.position.y + 1.7,
        player.position.z
    ];
    
    const lookDistance = 1.0;
    const target = [
        cameraPosition[0] + Math.sin(player.rotation.y) * lookDistance,
        cameraPosition[1] + Math.sin(player.rotation.x) * lookDistance,
        cameraPosition[2] + Math.cos(player.rotation.y) * lookDistance
    ];
    
    const viewMatrix = m4.lookAt(cameraPosition, target, [0, 1, 0]);
    
    // Passa le matrici corrette alla drawRoom
    drawRoom(gl, programInfo, roomElements, viewMatrix, projectionMatrix);
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