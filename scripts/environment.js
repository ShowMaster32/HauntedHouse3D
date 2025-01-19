// environment.js
import { loadTexture, createWall, createFloor, drawWall, drawFloor } from './models.js';
import { Vector3 } from './math.js';

const m4 = window.m4;

// Costanti per le dimensioni della stanza
const ROOM_WIDTH = 20;
const ROOM_HEIGHT = 10;
export const ROOM_DEPTH = 25;
const WALL_THICKNESS = 0.1;

// Percorsi delle texture
const TEXTURES = {
    wall: 'textures/wall.jpg',
    floor: 'textures/wood.jpg',
    ceiling: 'textures/ceiling.jpg',
    door: 'textures/door.png'
};

/**
* Inizializza l'ambiente WebGL.
* @param {string} canvasId - ID del canvas HTML
* @returns {Object} Contesto WebGL e canvas
*/
export function initializeEnvironment(canvasId) {
    const canvas = document.getElementById(canvasId);
    const gl = canvas.getContext('webgl', { antialias: true });
    
    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Cambia questo a un colore di debug, tipo rosso
    gl.clearColor(1.0, 0.0, 0.0, 1.0);  // Se vedi rosso invece di nero, sappiamo che il clear funziona
    
    if (!gl) {
        console.error('WebGL non supportato o contesto non disponibile');
        return null;
    }
    
    // Gestione corretta del DPI
    function resizeCanvasToDisplaySize() {
        const displayWidth = window.innerWidth;
        const displayHeight = window.innerHeight;
        
        if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
            canvas.width = displayWidth;
            canvas.height = displayHeight;
            gl.viewport(0, 0, canvas.width, canvas.height);
        }
    }
    resizeCanvasToDisplaySize();    
    
    // E aggiungila al listener di resize
    window.addEventListener('resize', resizeCanvasToDisplaySize);
    
    // Abilita il depth testing e il face culling
    // Cambia il colore di clear a grigio chiaro per debug
    gl.clearColor(0.2, 0.2, 0.2, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    
    return { gl, canvas };
}

/**
* Crea la stanza con pareti, pavimento e soffitto.
* @param {WebGLRenderingContext} gl - Contesto WebGL
* @returns {Object} Elementi della stanza
*/
export function createRoom(gl) {
    // Carica le texture
    const wallTexture = loadTexture(gl, TEXTURES.wall);
    const floorTexture = loadTexture(gl, TEXTURES.floor);
    const ceilingTexture = loadTexture(gl, TEXTURES.ceiling);
    
    // Pareti con normali verso l'interno della stanza
    const walls = [
        // Parete frontale (Z negativo)
        {
            mesh: createWall(gl, ROOM_WIDTH, ROOM_HEIGHT, wallTexture),
            position: new Vector3(0, ROOM_HEIGHT/2, -ROOM_DEPTH/2),
            rotation: new Vector3(0, Math.PI, 0),  // Ruotato per far puntare la normale verso l'interno
            collision: { type: 'plane', normal: new Vector3(0, 0, 1) }
        },
        // Parete posteriore (Z positivo)
        {
            mesh: createWall(gl, ROOM_WIDTH, ROOM_HEIGHT, wallTexture),
            position: new Vector3(0, ROOM_HEIGHT/2, ROOM_DEPTH/2),
            rotation: new Vector3(0, 0, 0),
            collision: { type: 'plane', normal: new Vector3(0, 0, -1) }
        },
        // Parete sinistra (X negativo)
        {
            mesh: createWall(gl, ROOM_DEPTH, ROOM_HEIGHT, wallTexture),
            position: new Vector3(-ROOM_WIDTH/2, ROOM_HEIGHT/2, 0),
            rotation: new Vector3(0, Math.PI/2, 0),
            collision: { type: 'plane', normal: new Vector3(1, 0, 0) }
        },
        // Parete destra (X positivo)
        {
            mesh: createWall(gl, ROOM_DEPTH, ROOM_HEIGHT, wallTexture),
            position: new Vector3(ROOM_WIDTH/2, ROOM_HEIGHT/2, 0),
            rotation: new Vector3(0, -Math.PI/2, 0),
            collision: { type: 'plane', normal: new Vector3(-1, 0, 0) }
        }
    ];
    
    // Pavimento
    const floor = {
        mesh: createFloor(gl, ROOM_WIDTH, ROOM_DEPTH, floorTexture),
        position: new Vector3(0, 0, 0),
        rotation: new Vector3(Math.PI/2, 0, 0),  // Ruotato per far puntare la normale verso l'alto
        collision: { type: 'plane', normal: new Vector3(0, 1, 0) }
    };
    
    // Soffitto
    const ceiling = {
        mesh: createFloor(gl, ROOM_WIDTH, ROOM_DEPTH, ceilingTexture),
        position: new Vector3(0, ROOM_HEIGHT, 0),
        rotation: new Vector3(-Math.PI/2, 0, 0),  // Ruotato per far puntare la normale verso il basso
        collision: { type: 'plane', normal: new Vector3(0, -1, 0) }
    };
    
    return { walls, floor, ceiling };
}

/**
* Disegna la stanza.
* @param {WebGLRenderingContext} gl - Contesto WebGL
* @param {Object} programInfo - Informazioni sul programma shader
* @param {Object} roomElements - Elementi della stanza
* @param {Float32Array} viewMatrix - Matrice di vista
* @param {Float32Array} projectionMatrix - Matrice di proiezione
*/
export function drawRoom(gl, programInfo, roomElements, viewMatrix, projectionMatrix) {
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);  // Culla solo i back faces

    // Disegna pareti
    roomElements.walls.forEach(wall => {
        const modelMatrix = createModelMatrix(wall.position, wall.rotation);
        drawWall(gl, programInfo, wall.mesh, modelMatrix);
    });

    // Disegna pavimento e soffitto
    const floorMatrix = createModelMatrix(roomElements.floor.position, roomElements.floor.rotation);
    drawFloor(gl, programInfo, roomElements.floor.mesh, floorMatrix);

    const ceilingMatrix = createModelMatrix(roomElements.ceiling.position, roomElements.ceiling.rotation);
    drawFloor(gl, programInfo, roomElements.ceiling.mesh, ceilingMatrix);
}

/**
* Crea una matrice di modello da posizione e rotazione.
* @param {Vector3} position - Posizione
* @param {Vector3} rotation - Rotazione
* @returns {Float32Array} Matrice di modello
*/
function createModelMatrix(position, rotation) {
    // Usa m4 invece di mat4
    let matrix = m4.identity();
    matrix = m4.translate(matrix, position.x, position.y, position.z);
    matrix = m4.xRotate(matrix, rotation.x);
    matrix = m4.yRotate(matrix, rotation.y);
    matrix = m4.zRotate(matrix, rotation.z);
    return matrix;
}

/**
* Ottiene gli oggetti di collisione della stanza.
* @param {Object} roomElements - Elementi della stanza
* @returns {Array} Array di oggetti di collisione
*/
export function getRoomColliders(roomElements) {
    const colliders = [];
    
    // Aggiungi collider per le pareti
    roomElements.walls.forEach(wall => {
        colliders.push({
            type: wall.collision.type,
            normal: wall.collision.normal,
            position: wall.position.clone(),
            rotation: wall.rotation.clone()
        });
    });
    
    // Aggiungi collider per pavimento e soffitto
    colliders.push({
        type: roomElements.floor.collision.type,
        normal: roomElements.floor.collision.normal,
        position: roomElements.floor.position.clone()
    });
    
    colliders.push({
        type: roomElements.ceiling.collision.type,
        normal: roomElements.ceiling.collision.normal,
        position: roomElements.ceiling.position.clone()
    });
    
    // Aggiungi collider per la porta
    colliders.push({
        type: roomElements.door.collision.type,
        dimensions: roomElements.door.collision.dimensions,
        position: roomElements.door.position.clone(),
        rotation: roomElements.door.rotation.clone()
    });
    
    return colliders;
}