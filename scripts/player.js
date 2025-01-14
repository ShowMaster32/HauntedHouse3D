import { Vector3 } from './math.js';

const GRAVITY = 9.81;          // Ridotta da 30 a 9.81
const PLAYER_RADIUS = 0.35;    
const JUMP_VELOCITY = 5;       // Ridotta da 10 a 5
const FRICTION = 0.92;         // Ridotta da 0.98 a 0.92
const MAX_FALL_SPEED = 20;     // Nuova costante per limitare la velocità di caduta

export class Player {
    constructor(camera) {
        console.log('[Player] Creazione del giocatore...');
        this.camera = camera;
        this.position = new Vector3(0, 1.8, 0);
        this.velocity = new Vector3(0, 0, 0);
        this.collider = {
            position: this.position.clone(),
            velocity: this.velocity.clone(),
            radius: PLAYER_RADIUS,
            onFloor: false,
        };
        this.keyStates = {};
        this.initControls();
        console.log('[Player] Giocatore creato con posizione:', this.position);
    }
    
    // Inizializza gli eventi per i controlli del giocatore
    initControls() {
        console.log('[Player] Inizializzazione dei controlli...');
        document.addEventListener('keydown', (event) => {
            this.keyStates[event.code] = true;
            console.log(`[Player] Tasto premuto: ${event.code}`);
        });
        
        document.addEventListener('keyup', (event) => {
            this.keyStates[event.code] = false;
            console.log(`[Player] Tasto rilasciato: ${event.code}`);
        });
    }
    
    // Aggiorna la posizione del giocatore in base ai controlli
    update(deltaTime, collisionObjects) {
        if (!deltaTime) return; // Previene deltaTime invalidi
        
        console.log(`[Player] Aggiornamento. deltaTime: ${deltaTime}`);
        const speed = this.collider.onFloor ? 8 : 2;
        const movement = new Vector3();
        
        // Movimenti del giocatore
        if (this.keyStates['KeyW']) movement.z = -speed * deltaTime;
        if (this.keyStates['KeyS']) movement.z = speed * deltaTime;
        if (this.keyStates['KeyA']) movement.x = -speed * deltaTime;
        if (this.keyStates['KeyD']) movement.x = speed * deltaTime;
        
        // Salto
        if (this.collider.onFloor && this.keyStates['Space']) {
            this.collider.velocity.y = JUMP_VELOCITY;
            this.collider.onFloor = false;
        }
        
        // Applica movimento
        this.collider.velocity.x += movement.x;
        this.collider.velocity.z += movement.z;
        
        // Applica gravità solo se non siamo a terra
        if (!this.collider.onFloor) {
            this.collider.velocity.y -= GRAVITY * deltaTime;
            // Limita la velocità di caduta
            if (this.collider.velocity.y < -MAX_FALL_SPEED) {
                this.collider.velocity.y = -MAX_FALL_SPEED;
            }
        }
        
        // Applica attrito
        this.collider.velocity.x *= FRICTION;
        this.collider.velocity.z *= FRICTION;
        
        // Aggiorna posizione
        this.collider.position.x += this.collider.velocity.x;
        this.collider.position.y += this.collider.velocity.y * deltaTime;
        this.collider.position.z += this.collider.velocity.z;
        
        // Controllo collisioni
        this.checkCollisions(collisionObjects);
        
        // Teleport se fuori dai limiti
        if (this.collider.position.y < -20) {
            this.collider.position = new Vector3(0, 5, 0);
            this.collider.velocity = new Vector3(0, 0, 0);
        }
        
        // Aggiorna la camera
        this.camera.position.x = this.collider.position.x;
        this.camera.position.y = this.collider.position.y;
        this.camera.position.z = this.collider.position.z;
    }
    
    // Controlla le collisioni con oggetti della scena
    checkCollisions(collisionObjects) {
        if (!Array.isArray(collisionObjects)) {
            console.warn('[Player] Gli oggetti di collisione devono essere un array.');
            return;
        }
        
        let wasOnFloor = this.collider.onFloor;
        this.collider.onFloor = false;
        
        for (const object of collisionObjects) {
            if (!object || !object.position || typeof object.radius !== 'number') continue;
            
            // Calcola la distanza
            const dx = this.collider.position.x - object.position.x;
            const dy = this.collider.position.y - object.position.y;
            const dz = this.collider.position.z - object.position.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const minDist = this.collider.radius + object.radius;
            
            if (distance < minDist) {
                // Collisione rilevata
                if (object.position.y < this.collider.position.y && 
                    Math.abs(this.collider.position.y - object.position.y) < this.collider.radius + 0.1) {
                        // Collisione con il pavimento
                        this.collider.onFloor = true;
                        this.collider.position.y = object.position.y + this.collider.radius;
                        if (this.collider.velocity.y < 0) {
                            this.collider.velocity.y = 0;
                        }
                    } else {
                        // Collisione con le pareti
                        const overlap = minDist - distance;
                        const pushX = (dx / distance) * overlap;
                        const pushZ = (dz / distance) * overlap;
                        
                        this.collider.position.x += pushX;
                        this.collider.position.z += pushZ;
                        
                        // Riduce la velocità nella direzione della collisione
                        if (Math.abs(pushX) > 0.01) this.collider.velocity.x = 0;
                        if (Math.abs(pushZ) > 0.01) this.collider.velocity.z = 0;
                    }
                }
            }
            
            // Se eravamo a terra ma ora non lo siamo più, e non stiamo saltando
            if (wasOnFloor && !this.collider.onFloor && this.collider.velocity.y <= 0) {
                this.collider.velocity.y = 0;
            }
        }
        
        // Riporta il giocatore all'interno della scena se cade fuori
        teleportIfOutOfBounds(bounds = { minY: -20 }) {
            if (this.collider.position.y <= bounds.minY) {
                console.warn('[Player] Giocatore fuori dai limiti. Teletrasporto alla posizione iniziale.');
                this.collider.position.set(0, 1.8, 0); // Riporta il giocatore alla posizione iniziale
                this.collider.velocity.set(0, 0, 0);   // Resetta la velocità
            }
        }
        
        // Ottiene il vettore di movimento avanti/indietro
        getForwardVector() {
            const direction = new Vector3(0, 0, -1);
            console.log(`[Player] Vettore forward: ${JSON.stringify(direction)}`);
            return direction.normalize();
        }
        
        // Ottiene il vettore di movimento laterale
        getSideVector() {
            const direction = new Vector3(-1, 0, 0);
            console.log(`[Player] Vettore laterale: ${JSON.stringify(direction)}`);
            return direction.normalize();
        }
    }
    
    export const controls = {
        keyStates: {},
        
        init() {
            console.log('[Controls] Inizializzazione dei controlli...');
            document.addEventListener('keydown', (event) => {
                this.keyStates[event.code] = true;
                console.log(`[Controls] Tasto premuto: ${event.code}`);
            });
            
            document.addEventListener('keyup', (event) => {
                this.keyStates[event.code] = false;
                console.log(`[Controls] Tasto rilasciato: ${event.code}`);
            });
        },
        
        isKeyPressed(key) {
            const isPressed = !!this.keyStates[key];
            console.log(`[Controls] Stato tasto ${key}: ${isPressed}`);
            return isPressed;
        },
    };
    