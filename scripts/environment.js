import { loadTexture, createWall, createFloor, drawWall, drawFloor } from './models.js';
const { mat4 } = glMatrix;

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

/**
 * Inizializza WebGL e il contesto.
 * @param {string} canvasId - L'ID del canvas HTML.
 * @returns {Object} Il contesto WebGL e il canvas.
 */
export function initializeEnvironment(canvasId) {
    console.log(`[Environment] Inizializzazione ambiente con canvasId: ${canvasId}`);
    const canvas = document.getElementById(canvasId);
    const gl = canvas.getContext('webgl');

    if (!gl) {
        console.error('[Environment] WebGL non supportato. Verifica che il browser supporti WebGL.');
        return null;
    }

    console.log('[Environment] WebGL inizializzato correttamente.');

    // Configurazione iniziale del canvas
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    gl.enable(gl.DEPTH_TEST);

    console.log('[Environment] Configurazione iniziale del canvas completata.');

    // Aggiorna le dimensioni del canvas al ridimensionamento della finestra
    window.addEventListener('resize', () => {
        console.log('[Environment] Ridimensionamento finestra rilevato. Aggiornamento canvas.');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
    });

    return { gl, canvas };
}

/**
 * Crea gli elementi della stanza con texture.
 * @param {WebGLRenderingContext} gl - Il contesto WebGL.
 * @returns {Object} Elementi della stanza.
 */
export function createRoom(gl) {
    console.log('[Environment] Creazione degli elementi della stanza.');
    try {
        const wallTexture = loadTexture(gl, textures.wall);
        const floorTexture = loadTexture(gl, textures.floor);
        const ceilingTexture = loadTexture(gl, textures.ceiling);

        console.log('[Environment] Texture caricate correttamente.');

        const walls = [
            createWall(gl, roomWidth, roomHeight, wallTexture),  // Parete frontale
            createWall(gl, roomWidth, roomHeight, wallTexture),  // Parete posteriore
            createWall(gl, roomDepth, roomHeight, wallTexture),  // Parete sinistra
            createWall(gl, roomDepth, roomHeight, wallTexture),  // Parete destra
        ];

        console.log('[Environment] Pareti create correttamente.');

        const floor = createFloor(gl, roomWidth, roomDepth, floorTexture);
        const ceiling = createFloor(gl, roomWidth, roomDepth, ceilingTexture);

        console.log('[Environment] Pavimento e soffitto creati correttamente.');

        return { walls, floor, ceiling };
    } catch (error) {
        console.error('[Environment] Errore durante la creazione della stanza:', error);
        return null;
    }
}

/**
 * Calcola la matrice di trasformazione per una parete.
 * @param {number} index - Indice della parete.
 * @param {mat4} viewMatrix - Matrice di vista.
 * @returns {mat4} Matrice di trasformazione per la parete.
 */
function getWallTransform(index, viewMatrix) {
    console.log(`[Environment] Calcolo trasformazione per parete indice: ${index}`);
    const modelViewMatrix = mat4.create();
    switch (index) {
        case 0:
            mat4.translate(modelViewMatrix, viewMatrix, [0, roomHeight / 2, -roomDepth / 2]);
            break;
        case 1:
            mat4.translate(modelViewMatrix, viewMatrix, [0, roomHeight / 2, roomDepth / 2]);
            break;
        case 2:
            mat4.translate(modelViewMatrix, viewMatrix, [-roomWidth / 2, roomHeight / 2, 0]);
            break;
        case 3:
            mat4.translate(modelViewMatrix, viewMatrix, [roomWidth / 2, roomHeight / 2, 0]);
            break;
        default:
            console.warn(`[Environment] Indice parete non valido: ${index}`);
    }
    return modelViewMatrix;
}

/**
 * Disegna la stanza, incluse pareti, pavimento e soffitto.
 * @param {WebGLRenderingContext} gl - Il contesto WebGL.
 * @param {Object} programInfo - Informazioni sul programma shader.
 * @param {Object} roomElements - Elementi della stanza.
 * @param {mat4} viewMatrix - Matrice di vista.
 * @param {mat4} projectionMatrix - Matrice di proiezione.
 */
export function drawRoom(gl, programInfo, roomElements, viewMatrix, projectionMatrix) {
    console.log('[Environment] Inizio disegno stanza.');
    const { walls, floor, ceiling } = roomElements;

    // Disegna le pareti
    walls.forEach((wall, index) => {
        const modelViewMatrix = getWallTransform(index, viewMatrix);
        console.log(`[Environment] Disegno parete indice: ${index}`);
        drawWall(gl, programInfo, wall, modelViewMatrix);
    });

    // Disegna il pavimento
    const floorModelViewMatrix = mat4.create();
    mat4.translate(floorModelViewMatrix, viewMatrix, [0, 0, 0]);
    console.log('[Environment] Disegno pavimento.');
    drawFloor(gl, programInfo, floor, floorModelViewMatrix);

    // Disegna il soffitto
    const ceilingModelViewMatrix = mat4.create();
    mat4.translate(ceilingModelViewMatrix, viewMatrix, [0, roomHeight, 0]);
    console.log('[Environment] Disegno soffitto.');
    drawFloor(gl, programInfo, ceiling, ceilingModelViewMatrix);
}

/**
 * Funzione principale per disegnare la scena.
 * @param {WebGLRenderingContext} gl - Il contesto WebGL.
 * @param {Object} programInfo - Informazioni sul programma shader.
 * @param {Object} roomElements - Elementi della stanza.
 * @param {mat4} viewMatrix - Matrice di vista.
 * @param {mat4} projectionMatrix - Matrice di proiezione.
 */
export function drawScene(gl, programInfo, roomElements, viewMatrix, projectionMatrix) {
    console.log('[Environment] Inizio disegno scena.');
    if (!gl || !roomElements) {
        console.error('[Environment] Contesto WebGL o elementi della stanza non definiti.');
        return;
    }
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    drawRoom(gl, programInfo, roomElements, viewMatrix, projectionMatrix);
    console.log('[Environment] Disegno scena completato.');
}
