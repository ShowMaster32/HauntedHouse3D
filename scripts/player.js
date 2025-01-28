// player.js
import { Vector3, MathUtils } from './math.js';

// Esportiamo le costanti
export const PLAYER_CONSTANTS = {
    GRAVITY: 9.81,
    JUMP_FORCE: 5,
    MOVE_SPEED: 8,
    SPRINT_SPEED: 12,
    FRICTION: 0.92,
    MAX_FALL_SPEED: 20,
    PLAYER_HEIGHT: 1.8,
    PLAYER_RADIUS: 0.35,
    CAMERA_SENSITIVITY: 0.002
};

export class Player {
    constructor(initialPosition = new Vector3(0, PLAYER_CONSTANTS.PLAYER_HEIGHT, 0)) {
        // Proprietà base
        this.position = initialPosition.clone();
        this.velocity = new Vector3();
        this.rotation = new Vector3();
        
        // Proprietà fisiche
        this.height = PLAYER_CONSTANTS.PLAYER_HEIGHT;
        this.radius = PLAYER_CONSTANTS.PLAYER_RADIUS;
        this.onGround = false;
        this.isSprinting = false;
        
        // Collider
        this.collider = {
            position: this.position.clone(),
            radius: this.radius,
            height: this.height
        };
        
        // Camera
        this.camera = {
            position: this.position.clone(),
            rotation: new Vector3(),
            fov: 75,
            sensitivity: PLAYER_CONSTANTS.CAMERA_SENSITIVITY
        };
        
        // Input
        this.keyStates = {};
        
        this.initControls();
    }
    
    initControls() {
        // Cambio da document a window per gli eventi tastiera
        window.addEventListener('keydown', (e) => {
            this.keyStates[e.code] = true;
            console.log("Tasto premuto:", e.code);
        });
        
        window.addEventListener('keyup', (e) => {
            this.keyStates[e.code] = false;
            console.log("Tasto rilasciato:", e.code);
        });
    
        // Controllo mouse invariato
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === document.querySelector('canvas')) {
                this.rotation.y -= e.movementX * this.camera.sensitivity;
                this.rotation.x -= e.movementY * this.camera.sensitivity;
                this.rotation.x = MathUtils.clamp(this.rotation.x, -Math.PI / 2, Math.PI / 2);
            }
        });
    }
    
    update(deltaTime, collisionObjects = []) {
        if (!deltaTime) return;
        
        this.handleMovement(deltaTime);
        this.applyPhysics(deltaTime);
        this.updateCollider();
        this.handleCollisions(collisionObjects);
        this.updateCamera();
        this.teleportIfOutOfBounds();
    }
    
    handleMovement(deltaTime) {
        console.log("Movement state:", this.keyStates);
        
        const speed = this.isSprinting ? PLAYER_CONSTANTS.SPRINT_SPEED : PLAYER_CONSTANTS.MOVE_SPEED;
        let moveX = 0;
        let moveZ = 0;
        
        if (this.keyStates['KeyW']) {
            moveZ = -Math.cos(this.rotation.y);
            moveX = -Math.sin(this.rotation.y);
        }
        if (this.keyStates['KeyS']) {
            moveZ = Math.cos(this.rotation.y);
            moveX = Math.sin(this.rotation.y);
        }
        if (this.keyStates['KeyA']) {
            moveX = -Math.cos(this.rotation.y);
            moveZ = Math.sin(this.rotation.y);
        }
        if (this.keyStates['KeyD']) {
            moveX = Math.cos(this.rotation.y);
            moveZ = -Math.sin(this.rotation.y);
        }
        
        if (moveX !== 0 || moveZ !== 0) {
            const moveAmount = speed * deltaTime;
            this.position.x += moveX * moveAmount;
            this.position.z += moveZ * moveAmount;
            console.log("Moving to:", this.position);
        }
    }
    
    applyPhysics(deltaTime) {
        // Gravità
        if (!this.onGround) {
            this.velocity.y -= PLAYER_CONSTANTS.GRAVITY * deltaTime;
            this.velocity.y = Math.max(this.velocity.y, -PLAYER_CONSTANTS.MAX_FALL_SPEED);
        }
        
        // Attrito
        this.velocity.x *= PLAYER_CONSTANTS.FRICTION;
        this.velocity.z *= PLAYER_CONSTANTS.FRICTION;
        
        // Aggiorna posizione
        const deltaPosition = this.velocity.clone().multiply(deltaTime);
        this.position.add(deltaPosition);
    }
    
    updateCollider() {
        this.collider.position.copy(this.position);
    }
    
    handleCollisions(collisionObjects) {
        if (!Array.isArray(collisionObjects)) {
            console.warn('handleCollisions: collisionObjects non è un array');
            return;
        }
        
        this.onGround = false;
        
        for (const obj of collisionObjects) {
            if (!obj || !obj.collision || !obj.position) {
                console.warn('handleCollisions: oggetto di collisione non valido', obj);
                continue;
            }
            
            if (obj.collision.type === 'plane' && obj.collision.normal) {
                try {
                    const distanceVec = this.position.clone().subtract(obj.position);
                    const distance = obj.collision.normal.dot(distanceVec);
                    
                    if (Math.abs(distance) < this.radius) {
                        const correction = obj.collision.normal.clone()
                        .multiply(this.radius - distance);
                        this.position.add(correction);
                        
                        if (obj.collision.normal.y > 0.7) {
                            this.onGround = true;
                            this.velocity.y = 0;
                        }
                    }
                } catch (error) {
                    console.error('Errore durante il calcolo della collisione:', error);
                    console.log('Oggetto problematico:', obj);
                    console.log('Player position:', this.position);
                }
            }
        }
    }
    
    checkCollision(object) {
        const dx = this.position.x - object.position.x;
        const dy = this.position.y - object.position.y;
        const dz = this.position.z - object.position.z;
        
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance < (this.radius + object.radius)) {
            return {
                collided: true,
                normal: new Vector3(dx / distance, 0, dz / distance),
                depth: (this.radius + object.radius) - distance
            };
        }
        
        return { collided: false };
    }
    
    resolveCollision(collision) {
        if (!collision.collided) return;
        
        this.position.x += collision.normal.x * collision.depth;
        this.position.z += collision.normal.z * collision.depth;
        
        const dot = this.velocity.x * collision.normal.x + 
        this.velocity.z * collision.normal.z;
        
        this.velocity.x -= collision.normal.x * dot;
        this.velocity.z -= collision.normal.z * dot;
    }
    
    updateCamera() {
        this.camera.position.copy(this.position);
        this.camera.position.y += this.height;
        this.camera.rotation.copy(this.rotation);
    }
    
    teleportIfOutOfBounds(minY = -20) {
        if (this.position.y < minY) {
            this.position.set(0, PLAYER_CONSTANTS.PLAYER_HEIGHT, 0);
            this.velocity.set(0, 0, 0);
            this.rotation.set(0, 0, 0);
        }
    }
    
    getCameraDirection() {
        const direction = new Vector3(0, 0, -1);
        
        const cosY = Math.cos(this.camera.rotation.y);
        const sinY = Math.sin(this.camera.rotation.y);
        const cosX = Math.cos(this.camera.rotation.x);
        const sinX = Math.sin(this.camera.rotation.x);
        
        return new Vector3(
            direction.x * cosY + direction.z * sinY,
            direction.x * -sinY * sinX + direction.y * cosX + direction.z * cosY * sinX,
            direction.x * sinY * cosX + direction.y * sinX + direction.z * -cosY * cosX
        ).normalize();
    }
}

export const controls = {
    init() {
        document.addEventListener('click', () => {
            const canvas = document.querySelector('canvas');
            canvas.requestPointerLock();
        });
    }
};