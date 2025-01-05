import { loadTexture, createWall, createFloor } from './models.js';

// Costanti per la dimensione della stanza
const roomWidth = 20;
const roomHeight = 10;
const roomDepth = 25;

// Texture della stanza
const textures = {
    wall: 'textures/wall.jpg',
    floor: 'textures/wood.jpg',
    ceiling: 'textures/ceiling.jpg',
};

// Inizializza WebGL e il contesto
export function initializeEnvironment(canvasId) {
    const canvas = document.getElementById(canvasId);
    const gl = canvas.getContext('webgl');

    if (!gl) {
        alert('WebGL non supportato');
        return null;
    }

    // Configurazione iniziale del canvas
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    gl.enable(gl.DEPTH_TEST);

    // Ridimensiona canvas alla finestra
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
    });

    return { gl, canvas };
}

// Carica le texture e crea gli elementi della stanza
export function createRoom(gl) {
    const wallTexture = loadTexture(gl, textures.wall);
    const floorTexture = loadTexture(gl, textures.floor);
    const ceilingTexture = loadTexture(gl, textures.ceiling);

    // Creazione delle pareti, pavimento e soffitto
    const walls = [
        createWall(gl, roomWidth, roomHeight, wallTexture),  // Parete frontale
        createWall(gl, roomWidth, roomHeight, wallTexture),  // Parete posteriore
        createWall(gl, roomDepth, roomHeight, wallTexture),  // Parete sinistra
        createWall(gl, roomDepth, roomHeight, wallTexture),  // Parete destra
    ];

    const floor = createFloor(gl, roomWidth, roomDepth, floorTexture);
    const ceiling = createFloor(gl, roomWidth, roomDepth, ceilingTexture);

    return { walls, floor, ceiling };
}

// Disegna la stanza (pareti, pavimento, soffitto)
export function drawRoom(gl, programInfo, roomElements, viewMatrix, projectionMatrix) {
    const { walls, floor, ceiling } = roomElements;

    // Disegna le pareti
    walls.forEach((wall, index) => {
        const modelViewMatrix = mat4.create();
        switch (index) {
            case 0: mat4.translate(modelViewMatrix, viewMatrix, [0, roomHeight / 2, -roomDepth / 2]); break;
            case 1: mat4.translate(modelViewMatrix, viewMatrix, [0, roomHeight / 2, roomDepth / 2]); break;
            case 2: mat4.translate(modelViewMatrix, viewMatrix, [-roomWidth / 2, roomHeight / 2, 0]); break;
            case 3: mat4.translate(modelViewMatrix, viewMatrix, [roomWidth / 2, roomHeight / 2, 0]); break;
        }
        drawWall(gl, programInfo, wall, modelViewMatrix);
    });

    // Disegna il pavimento
    const floorModelViewMatrix = mat4.create();
    mat4.translate(floorModelViewMatrix, viewMatrix, [0, 0, 0]);
    drawFloor(gl, programInfo, floor, floorModelViewMatrix);

    // Disegna il soffitto
    const ceilingModelViewMatrix = mat4.create();
    mat4.translate(ceilingModelViewMatrix, viewMatrix, [0, roomHeight, 0]);
    drawFloor(gl, programInfo, ceiling, ceilingModelViewMatrix);
}
