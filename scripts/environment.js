// environment.js
import { loadTexture, createWall, createFloor, drawWall, drawFloor } from './models.js';
import { Vector3 } from './math.js';

const m4 = window.m4;

// Costanti per le dimensioni della stanza
const ROOM_WIDTH = 20;
const ROOM_HEIGHT = 10;
const ROOM_DEPTH = 25;
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
    
    if (!gl) {
        console.error('WebGL non supportato o contesto non disponibile');
        return null;
    }
    
    // Gestione corretta del DPI
    function resizeCanvasToDisplaySize() {
        const displayWidth = window.innerWidth;
        const displayHeight = window.innerHeight;

        // Imposta le dimensioni del buffer del canvas
        canvas.width = displayWidth;
        canvas.height = displayHeight;

        // Aggiorna il viewport di WebGL
        gl.viewport(0, 0, canvas.width, canvas.height);
    }

    // Chiamala subito
    resizeCanvasToDisplaySize();
    
    // E aggiungila al listener di resize
    window.addEventListener('resize', resizeCanvasToDisplaySize);
    
    // Abilita il depth testing e il face culling
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    
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
    const doorTexture = loadTexture(gl, TEXTURES.door);
    
    // Crea le pareti
    const walls = [
        {
            mesh: createWall(gl, ROOM_WIDTH, ROOM_HEIGHT, wallTexture),
            position: new Vector3(0, ROOM_HEIGHT/2, -ROOM_DEPTH/2),
            rotation: new Vector3(0, 0, 0),
            collision: { type: 'plane', normal: new Vector3(0, 0, 1) }
        },
        {
            mesh: createWall(gl, ROOM_WIDTH, ROOM_HEIGHT, wallTexture),
            position: new Vector3(0, ROOM_HEIGHT/2, ROOM_DEPTH/2),
            rotation: new Vector3(0, Math.PI, 0),
            collision: { type: 'plane', normal: new Vector3(0, 0, -1) }
        },
        {
            mesh: createWall(gl, ROOM_DEPTH, ROOM_HEIGHT, wallTexture),
            position: new Vector3(-ROOM_WIDTH/2, ROOM_HEIGHT/2, 0),
            rotation: new Vector3(0, Math.PI/2, 0),
            collision: { type: 'plane', normal: new Vector3(1, 0, 0) }
        },
        {
            mesh: createWall(gl, ROOM_DEPTH, ROOM_HEIGHT, wallTexture),
            position: new Vector3(ROOM_WIDTH/2, ROOM_HEIGHT/2, 0),
            rotation: new Vector3(0, -Math.PI/2, 0),
            collision: { type: 'plane', normal: new Vector3(-1, 0, 0) }
        }
    ];
    
    // Crea pavimento e soffitto
    const floor = {
        mesh: createFloor(gl, ROOM_WIDTH, ROOM_DEPTH, floorTexture),
        position: new Vector3(0, 0, 0),
        rotation: new Vector3(-Math.PI/2, 0, 0),
        collision: { type: 'plane', normal: new Vector3(0, 1, 0) }
    };
    
    const ceiling = {
        mesh: createFloor(gl, ROOM_WIDTH, ROOM_DEPTH, ceilingTexture),
        position: new Vector3(0, ROOM_HEIGHT, 0),
        rotation: new Vector3(Math.PI/2, 0, 0),
        collision: { type: 'plane', normal: new Vector3(0, -1, 0) }
    };
    
    // Crea la porta
    const door = {
        mesh: createWall(gl, 4, 8, doorTexture),
        position: new Vector3(-ROOM_WIDTH/2 + 0.1, 4, 0),
        rotation: new Vector3(0, Math.PI/2, 0),
        collision: { type: 'box', dimensions: new Vector3(0.1, 8, 4) }
    };
    
    // Assicurati di restituire un oggetto con tutte queste proprietà
    return { walls, floor, ceiling, door };
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
    // Verifica che roomElements esista e abbia le proprietà necessarie
    if (!roomElements) {
        console.error('Room elements non definiti');
        return;
    }

    const { walls = [], floor, ceiling, door } = roomElements;
    
    // Imposta le matrici di proiezione e vista
    gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.viewMatrix, false, viewMatrix);
    
    // Disegna le pareti, con controllo aggiuntivo
    walls.forEach(wall => {
        if (wall && wall.mesh) {
            const modelMatrix = createModelMatrix(wall.position, wall.rotation);
            drawWall(gl, programInfo, wall.mesh, modelMatrix);
        }
    });
    
    // Disegna pavimento e soffitto
    if (floor && floor.mesh) {
        const floorMatrix = createModelMatrix(floor.position, floor.rotation);
        drawFloor(gl, programInfo, floor.mesh, floorMatrix);
    }
    
    if (ceiling && ceiling.mesh) {
        const ceilingMatrix = createModelMatrix(ceiling.position, ceiling.rotation);
        drawFloor(gl, programInfo, ceiling.mesh, ceilingMatrix);
    }
    
    // Disegna la porta
    if (door && door.mesh) {
        const doorMatrix = createModelMatrix(door.position, door.rotation);
        drawWall(gl, programInfo, door.mesh, doorMatrix);
    }
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