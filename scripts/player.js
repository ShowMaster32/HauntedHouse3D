// player.js
import { Vector3, MathUtils } from './math.js';

export const PLAYER_CONSTANTS = {
    // Fisica e movimento
    MOVE_SPEED: 8.0,
    SPRINT_SPEED: 12.0,
    GRAVITY: 20.0,
    
    // Dimensioni stanza e giocatore
    ROOM_WIDTH: 40.0,
    ROOM_HEIGHT: 15.0,
    ROOM_DEPTH: 50.0,
    PLAYER_HEIGHT: 2.0,
    PLAYER_RADIUS: 0.4,
    EYE_HEIGHT: 1.85,
    
    // Fisica movimento
    FRICTION: 0.92,          // Attrito un po' più alto per movimento più stabile
    AIR_RESISTANCE: 0.98,    // Resistenza aria più alta per maggiore controllo
    
    // Camera
    CAMERA_SENSITIVITY: 0.002
};

export class Player {
    constructor(initialPosition) {
        this.position = initialPosition || new Vector3(0, PLAYER_CONSTANTS.PLAYER_HEIGHT, 0);
        this.velocity = new Vector3(0, 0, 0);
        this.yaw = 0;  // Solo rotazione orizzontale
        this.forward = new Vector3(0, 0, -1);
        this.right = new Vector3(1, 0, 0);
        
        // Stati
        this.onGround = false;
        this.isSprinting = false;
        this.keyStates = {};
        
        this.initControls();
    }

    initControls() {
        window.addEventListener('keydown', (e) => {
            this.keyStates[e.code] = true;
            if (e.code === 'ShiftLeft') this.isSprinting = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keyStates[e.code] = false;
            if (e.code === 'ShiftLeft') this.isSprinting = false;
        });

        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === document.querySelector('canvas')) {
                // Solo rotazione orizzontale
                this.yaw -= e.movementX * PLAYER_CONSTANTS.CAMERA_SENSITIVITY;
                this.updateDirectionVectors();
            }
        });
    }

    updateDirectionVectors() {
        // Aggiorna i vettori di direzione basati solo sulla rotazione yaw
        this.forward.x = -Math.sin(this.yaw);
        this.forward.y = 0;  // La y rimane 0 per movimento orizzontale
        this.forward.z = -Math.cos(this.yaw);
        this.forward.normalize();

        // Aggiorna il vettore destro
        this.right.x = Math.cos(this.yaw);
        this.right.y = 0;
        this.right.z = -Math.sin(this.yaw);
        this.right.normalize();
    }

    handleMovement(deltaTime) {
        const speed = this.isSprinting ? 
            PLAYER_CONSTANTS.SPRINT_SPEED : 
            PLAYER_CONSTANTS.MOVE_SPEED;

        let movement = new Vector3(0, 0, 0);

        // Input movimento
        if (this.keyStates['KeyW']) movement.add(this.forward);
        if (this.keyStates['KeyS']) movement.subtract(this.forward);
        if (this.keyStates['KeyA']) movement.subtract(this.right);
        if (this.keyStates['KeyD']) movement.add(this.right);

        // Normalizza e applica il movimento
        if (movement.lengthSquared() > 0) {
            movement.normalize();
            movement.multiply(speed * deltaTime);
            
            // Solo movimento orizzontale - la y rimane invariata
            this.velocity.x = movement.x;
            this.velocity.z = movement.z;
        } else {
            // Applica attrito quando non ci si muove
            this.velocity.x *= this.onGround ? PLAYER_CONSTANTS.FRICTION : PLAYER_CONSTANTS.AIR_RESISTANCE;
            this.velocity.z *= this.onGround ? PLAYER_CONSTANTS.FRICTION : PLAYER_CONSTANTS.AIR_RESISTANCE;
        }
    }

    applyPhysics(deltaTime) {
        // Applica gravità solo quando non si è sul terreno
        if (!this.onGround) {
            this.velocity.y -= PLAYER_CONSTANTS.GRAVITY * deltaTime;
        }

        // Aggiorna posizione
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y * deltaTime;
        this.position.z += this.velocity.z;

        // Controlla collisioni con i limiti della stanza
        const halfWidth = PLAYER_CONSTANTS.ROOM_WIDTH / 2 - PLAYER_CONSTANTS.PLAYER_RADIUS;
        const halfDepth = PLAYER_CONSTANTS.ROOM_DEPTH / 2 - PLAYER_CONSTANTS.PLAYER_RADIUS;
        
        this.position.x = MathUtils.clamp(this.position.x, -halfWidth, halfWidth);
        this.position.z = MathUtils.clamp(this.position.z, -halfDepth, halfDepth);

        // Imposta altezza minima (pavimento)
        if (this.position.y < PLAYER_CONSTANTS.PLAYER_HEIGHT) {
            this.position.y = PLAYER_CONSTANTS.PLAYER_HEIGHT;
            this.velocity.y = 0;
            this.onGround = true;
        }
    }

    getViewMatrix() {
        // Posizione della camera (occhi)
        const eyePosition = new Vector3(
            this.position.x,
            this.position.y + PLAYER_CONSTANTS.EYE_HEIGHT - PLAYER_CONSTANTS.PLAYER_HEIGHT,
            this.position.z
        );

        // Punto di vista
        const target = new Vector3(
            eyePosition.x + this.forward.x,
            eyePosition.y,  // Mantiene y costante per vista parallela al pavimento
            eyePosition.z + this.forward.z
        );

        // Vector UP sempre (0,1,0) per mantenere l'orizzonte dritto
        const up = new Vector3(0, 1, 0);

        return window.m4.lookAt(
            [eyePosition.x, eyePosition.y, eyePosition.z],
            [target.x, target.y, target.z],
            [up.x, up.y, up.z]
        );
    }

    update(deltaTime) {
        if (!deltaTime) return;

        this.handleMovement(deltaTime);
        this.applyPhysics(deltaTime);
    }
}

export const controls = {
    init() {
        document.addEventListener('click', () => {
            const canvas = document.querySelector('canvas');
            if (canvas) canvas.requestPointerLock();
        });
    }
};