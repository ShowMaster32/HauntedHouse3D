import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { Capsule } from 'three/addons/math/Capsule.js';
import { Octree } from 'three/addons/math/Octree.js';
import { controls } from './controls.js';
import { createWallWithWindowAndDoor } from './createWallWithWindowAndDoor.js';
import { addObjects } from './addObjects.js';

const clock = new THREE.Clock();
const scene = new THREE.Scene();

// Function logic to create walls, windows, and doors
const roomWidth = 20;
const roomHeight = 10;
const roomDepth = 25;
const windowWidth = 6;
const windowHeight = 4;
const doorWidth = 4;
const doorHeight = 8;
const wallThickness = 0.1;

// Initialize switchPosition using these variables
let switchPosition = new THREE.Vector3(-roomWidth / 2 + 0.1, doorHeight / 2, doorWidth / 2 + 0.5);

// Initialize keyStates before usage
const keyStates = {};

const textureLoader = new THREE.TextureLoader();
const loader = new THREE.CubeTextureLoader();
const texture = loader.load([
    'textures/skybox/px.png', 
    'textures/skybox/nx.png', 
    'textures/skybox/py.png', 
    'textures/skybox/ny.png', 
    'textures/skybox/pz.png', 
    'textures/skybox/nz.png'
]);
scene.background = texture;

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.rotation.order = 'YXZ';

const fillLight1 = new THREE.HemisphereLight(0x8dc1de, 0x00668d, 1.5);
fillLight1.position.set(2, 1, 1);
scene.add(fillLight1);

const container = document.getElementById('container');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
container.appendChild(renderer.domElement);

const stats = new Stats();
stats.domElement.style.position = 'absolute';
stats.domElement.style.top = '0px';
container.appendChild(stats.domElement);

const GRAVITY = 30;
const STEPS_PER_FRAME = 5;
const worldOctree = new Octree();

const playerCollider = new Capsule(new THREE.Vector3(0, 0.35, 0), new THREE.Vector3(0, 4, 0), 0.35);
const playerVelocity = new THREE.Vector3();
const playerDirection = new THREE.Vector3();
let playerOnFloor = false;
let canToggleLight = true;

document.addEventListener('keydown', (event) => {
    keyStates[event.code] = true;
});

document.addEventListener('keyup', (event) => {
    keyStates[event.code] = false;
    if (event.code === 'KeyF') {
        canToggleLight = true;
    }
});

container.addEventListener('mousedown', () => {
    document.body.requestPointerLock();
    document.getElementById('crosshair').style.display = 'block';
});

document.body.addEventListener('mousemove', (event) => {
    if (document.pointerLockElement === document.body) {
        camera.rotation.y -= event.movementX / 500;
        camera.rotation.x -= event.movementY / 500;
    }
});

window.addEventListener('resize', onWindowResize);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Funzioni per la gestione del pannello di controllo
document.getElementById('toggleShadows').addEventListener('click', () => {
    toggleShadows();
});

document.getElementById('toggleReflections').addEventListener('click', () => {
    toggleReflections();
});

document.getElementById('toggleFPS').addEventListener('click', () => {
    stats.dom.style.display = stats.dom.style.display === 'none' ? 'block' : 'none';
});

document.getElementById('advancedRendering').addEventListener('click', () => {
    toggleAdvancedRendering();
});

function toggleShadows() {
    renderer.shadowMap.enabled = !renderer.shadowMap.enabled;
    scene.traverse((object) => {
        if (object.isMesh) {
            object.castShadow = renderer.shadowMap.enabled;
            object.receiveShadow = renderer.shadowMap.enabled;
        }
    });
}

function toggleReflections() {
    scene.traverse((object) => {
        if (object.isMesh && object.material.envMap) {
            object.material.envMapIntensity = object.material.envMapIntensity === 1 ? 0 : 1;
            object.material.needsUpdate = true;
        }
    });
}

function toggleAdvancedRendering() {
    renderer.shadowMap.type = renderer.shadowMap.type === THREE.VSMShadowMap ? THREE.PCFSoftShadowMap : THREE.VSMShadowMap;
}

// Creazione della stanza
createWallWithWindowAndDoor(scene, textureLoader);

// Aggiunta degli oggetti alla scena
const pointLight = addObjects(scene, textureLoader, doorHeight);  // Now pointLight is available

// Aggiunta delle pareti e del pavimento all'Octree per le collisioni
worldOctree.fromGraphNode(scene);

function playerCollisions() {
    const result = worldOctree.capsuleIntersect(playerCollider);
    playerOnFloor = false;
    if (result) {
        playerOnFloor = result.normal.y > 0;
        if (!playerOnFloor) {
            playerVelocity.addScaledVector(result.normal, -result.normal.dot(playerVelocity));
        }
        if (result.depth >= 1e-10) {
            playerCollider.translate(result.normal.multiplyScalar(result.depth));
        }
    }
}

function updatePlayer(deltaTime) {
    let damping = Math.exp(-4 * deltaTime) - 1;
    if (!playerOnFloor) {
        playerVelocity.y -= GRAVITY * deltaTime;
        damping *= 0.1;
    }
    playerVelocity.addScaledVector(playerVelocity, damping);
    const deltaPosition = playerVelocity.clone().multiplyScalar(deltaTime);
    playerCollider.translate(deltaPosition);
    playerCollisions();
    camera.position.copy(playerCollider.end);
}

function animate() {
    const deltaTime = Math.min(0.05, clock.getDelta()) / STEPS_PER_FRAME;
    for (let i = 0; i < STEPS_PER_FRAME; i++) {
        controls(deltaTime, playerOnFloor, playerVelocity, keyStates, playerCollider, switchPosition, instructions, crosshair, pointLight, flickerLight, canToggleLight, isFlickering);
        updatePlayer(deltaTime);
    }
    renderer.render(scene, camera);
    stats.update();
}
