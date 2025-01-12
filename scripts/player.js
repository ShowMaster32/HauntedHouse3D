import { Vector3 } from './math.js';

const GRAVITY = 30; // Gravità applicata al giocatore
const PLAYER_RADIUS = 0.35; // Raggio del collider del giocatore
const JUMP_VELOCITY = 10; // Velocità del salto
const FRICTION = 0.98; // Attrito per rallentare i movimenti

export class Player {
    constructor(camera) {
        console.log('[Player] Creazione del giocatore...');
        this.camera = camera; // La camera è passata come oggetto
        this.collider = {
            position: new Vector3(0, 1.8, 0), // Posizione iniziale del giocatore
            velocity: new Vector3(0, 0, 0),   // Velocità iniziale
            radius: PLAYER_RADIUS,            // Raggio del collider
            onFloor: false,                   // Indica se il giocatore è a terra
        };
        this.keyStates = {}; // Stato dei tasti premuti
        this.initControls();
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
        console.log(`[Player] Aggiornamento. deltaTime: ${deltaTime}`);
        const speed = this.collider.onFloor ? 8 : 2; // Velocità diversa a terra o in aria
        const movement = new Vector3();

        // Movimenti del giocatore
        if (this.keyStates['KeyW']) movement.add(this.getForwardVector().multiplyScalar(speed * deltaTime));
        if (this.keyStates['KeyS']) movement.add(this.getForwardVector().multiplyScalar(-speed * deltaTime));
        if (this.keyStates['KeyA']) movement.add(this.getSideVector().multiplyScalar(-speed * deltaTime));
        if (this.keyStates['KeyD']) movement.add(this.getSideVector().multiplyScalar(speed * deltaTime));

        console.log(`[Player] Movimento calcolato: ${JSON.stringify(movement)}`);

        // Salto
        if (this.collider.onFloor && this.keyStates['Space']) {
            this.collider.velocity.y = JUMP_VELOCITY; // Salta solo se il giocatore è a terra
            console.log('[Player] Salto eseguito');
        }

        // Aggiungi il movimento alla velocità
        this.collider.velocity.add(movement);

        // Applica gravità se il giocatore non è a terra
        if (!this.collider.onFloor) {
            this.collider.velocity.y -= GRAVITY * deltaTime;
        }

        // Applica attrito
        this.collider.velocity.multiplyScalar(FRICTION);

        console.log(`[Player] Velocità aggiornata: ${JSON.stringify(this.collider.velocity)}`);

        // Calcola la nuova posizione
        const deltaPosition = this.collider.velocity.clone().multiplyScalar(deltaTime);
        this.collider.position.add(deltaPosition);

        console.log(`[Player] Posizione aggiornata: ${JSON.stringify(this.collider.position)}`);

        // Controlla le collisioni
        this.checkCollisions(collisionObjects);

        // Aggiorna la posizione della camera
        this.camera.position = this.collider.position.clone(); // Usa `clone` per assegnare la nuova posizione
    }

    // Controlla le collisioni con oggetti della scena
    checkCollisions(collisionObjects) {
        console.log("[Player] Controllo delle collisioni...");
        if (!Array.isArray(collisionObjects)) {
            console.warn('[Player] Gli oggetti di collisione devono essere un array.');
            return;
        }
    
        this.collider.onFloor = false; // Resetta lo stato "a terra"
        collisionObjects.forEach((object, index) => {
            if (!object || !object.position || typeof object.radius !== 'number') {
                console.warn(`[Player] Oggetto di collisione non valido all'indice ${index}:`, object);
                return;
            }
    
            const objectPosition = new Vector3(object.position.x, object.position.y, object.position.z);
            const distance = objectPosition.subtract(this.collider.position).length();
    
            console.log(`[Player] Distanza calcolata con oggetto ${index}: ${distance}`);
    
            // Verifica collisioni con pavimento o oggetti
            if (distance < this.collider.radius + object.radius) {
                console.log(`[Player] Collisione rilevata con oggetto ${index}.`);
                this.collider.onFloor = true;
    
                if (object.position.y < this.collider.position.y) { // Collisione con pavimento
                    this.collider.position.y = object.position.y + this.collider.radius; // Sposta il giocatore sopra il pavimento
                }
    
                const overlap = this.collider.radius + object.radius - distance;
                const direction = objectPosition.subtract(this.collider.position).normalize();
                this.collider.position.add(direction.multiplyScalar(-overlap));
                this.collider.velocity.multiplyScalar(0); // Arresta il movimento
            }
        });
    
        if (!this.collider.onFloor) {
            console.warn('[Player] Il giocatore non è a terra, continua a cadere.');
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
