// player.js
import { Vector3, MathUtils } from './math.js';

// Costanti per la fisica del player
const GRAVITY = 9.81;
const JUMP_FORCE = 5;
const MOVE_SPEED = 8;
const SPRINT_SPEED = 12;
const FRICTION = 0.92;
const MAX_FALL_SPEED = 20;
const PLAYER_HEIGHT = 1.8;
const PLAYER_RADIUS = 0.35;
const CAMERA_SENSITIVITY = 0.002;

export class Player {
    constructor(initialPosition = new Vector3(0, PLAYER_HEIGHT, 0)) {
        // Proprietà base
        this.position = initialPosition.clone();
        this.velocity = new Vector3();
        this.rotation = new Vector3();
        
        // Proprietà fisiche
        this.height = PLAYER_HEIGHT;
        this.radius = PLAYER_RADIUS;
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
            sensitivity: CAMERA_SENSITIVITY
        };
        
        // Input
        this.keyStates = {};
        
        this.initControls();
    }
    
    initControls() {
        // Tastiera
        document.addEventListener('keydown', (e) => {
            this.keyStates[e.code] = true;
            if (e.code === 'ShiftLeft') this.isSprinting = true;
        });
        
        document.addEventListener('keyup', (e) => {
            this.keyStates[e.code] = false;
            if (e.code === 'ShiftLeft') this.isSprinting = false;
        });
        
        // Mouse
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === document.querySelector('canvas')) {
                this.rotation.y -= e.movementX * this.camera.sensitivity;
                this.rotation.x -= e.movementY * this.camera.sensitivity;
                
                // Limita la rotazione verticale della camera
                this.rotation.x = MathUtils.clamp(
                    this.rotation.x,
                    -Math.PI / 2,
                    Math.PI / 2
                );
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
        const speed = this.isSprinting ? SPRINT_SPEED : MOVE_SPEED;
        const moveVector = new Vector3();
        
        if (this.keyStates['KeyW']) {
            moveVector.z -= Math.cos(this.rotation.y);
            moveVector.x -= Math.sin(this.rotation.y);
        }
        if (this.keyStates['KeyS']) {
            moveVector.z += Math.cos(this.rotation.y);
            moveVector.x += Math.sin(this.rotation.y);
        }
        if (this.keyStates['KeyA']) {
            moveVector.x -= Math.cos(this.rotation.y);
            moveVector.z += Math.sin(this.rotation.y);
        }
        if (this.keyStates['KeyD']) {
            moveVector.x += Math.cos(this.rotation.y);
            moveVector.z -= Math.sin(this.rotation.y);
        }
        
        if (moveVector.length() > 0) {
            moveVector.normalize().multiply(speed * deltaTime);
            this.velocity.x += moveVector.x;
            this.velocity.z += moveVector.z;
        }
        
        if (this.keyStates['Space'] && this.onGround) {
            this.velocity.y = JUMP_FORCE;
            this.onGround = false;
        }
    }
    
    applyPhysics(deltaTime) {
        // Gravità
        if (!this.onGround) {
            this.velocity.y -= GRAVITY * deltaTime;
            this.velocity.y = Math.max(this.velocity.y, -MAX_FALL_SPEED);
        }
        
        // Attrito
        this.velocity.x *= FRICTION;
        this.velocity.z *= FRICTION;
        
        // Aggiorna posizione
        const deltaPosition = this.velocity.clone().multiply(deltaTime);
        this.position.add(deltaPosition);
    }
    
    updateCollider() {
        this.collider.position.copy(this.position);
    }
    
    handleCollisions(collisionObjects) {
        this.onGround = false;
        
        for (const obj of collisionObjects) {
            if (!obj) continue;
            
            const collision = this.checkCollision(obj);
            if (collision.collided) {
                this.resolveCollision(collision);
                
                if (collision.normal.y > 0.7) {
                    this.onGround = true;
                    this.velocity.y = 0;
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
            this.position.set(0, PLAYER_HEIGHT, 0);
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