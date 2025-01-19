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
        // Debug dei controlli
        console.log("Initializing controls...");
        
        // Aggiungi event listeners direttamente al document
        document.addEventListener('keydown', (e) => {
            console.log("Key pressed:", e.code);  // Debug
            this.keyStates[e.code] = true;
            if (e.code === 'ShiftLeft') this.isSprinting = true;
            
            // Previeni il comportamento di default per i tasti di movimento
            if (['KeyW', 'KeyS', 'KeyA', 'KeyD', 'Space'].includes(e.code)) {
                e.preventDefault();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            console.log("Key released:", e.code);  // Debug
            this.keyStates[e.code] = false;
            if (e.code === 'ShiftLeft') this.isSprinting = false;
        });
    
        // Mouse
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === document.querySelector('canvas')) {
                this.rotation.y -= e.movementX * this.camera.sensitivity;
                this.rotation.x -= e.movementY * this.camera.sensitivity;
                
                // Limita la rotazione verticale
                this.rotation.x = MathUtils.clamp(
                    this.rotation.x,
                    -Math.PI / 2,
                    Math.PI / 2
                );
                
                console.log("Mouse moved, rotation:", this.rotation);  // Debug
            }
        });
        
        // Touch
        let touchStartX = 0;
        let touchStartY = 0;
        
        document.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        });
        
        document.addEventListener('touchmove', (e) => {
            const touchX = e.touches[0].clientX;
            const touchY = e.touches[0].clientY;
            
            const deltaX = touchX - touchStartX;
            const deltaY = touchY - touchStartY;
            
            this.rotation.y -= deltaX * 0.01;
            this.rotation.x -= deltaY * 0.01;
            
            this.rotation.x = MathUtils.clamp(
                this.rotation.x,
                -Math.PI / 2,
                Math.PI / 2
            );
            
            touchStartX = touchX;
            touchStartY = touchY;
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
        const speed = this.isSprinting ? PLAYER_CONSTANTS.SPRINT_SPEED : PLAYER_CONSTANTS.MOVE_SPEED;
        const moveVector = new Vector3();
        
        if (this.keyStates['KeyW']) {
            moveVector.z -= Math.cos(this.rotation.y);
            moveVector.x -= Math.sin(this.rotation.y);
            console.log("Moving forward");  // Debug
        }
        if (this.keyStates['KeyS']) {
            moveVector.z += Math.cos(this.rotation.y);
            moveVector.x += Math.sin(this.rotation.y);
            console.log("Moving backward");  // Debug
        }
        if (this.keyStates['KeyA']) {
            moveVector.x -= Math.cos(this.rotation.y);
            moveVector.z += Math.sin(this.rotation.y);
            console.log("Moving left");  // Debug
        }
        if (this.keyStates['KeyD']) {
            moveVector.x += Math.cos(this.rotation.y);
            moveVector.z -= Math.sin(this.rotation.y);
            console.log("Moving right");  // Debug
        }
        
        if (moveVector.length() > 0) {
            moveVector.normalize().multiply(speed * deltaTime);
            this.position.add(moveVector);
            console.log("New position:", this.position);  // Debug
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