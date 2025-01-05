import { Vector3 } from './math.js';

const GRAVITY = 30; // Gravità applicata al giocatore
const PLAYER_RADIUS = 0.35; // Raggio del collider del giocatore
const JUMP_VELOCITY = 10; // Velocità del salto
const FRICTION = 0.98; // Attrito per rallentare i movimenti

// Classe per gestire il giocatore
export class Player {
    constructor(camera) {
        this.camera = camera; // Riferimento alla camera per seguire il giocatore
        this.collider = {
            position: new Vector3(0, 0.35, 0), // Posizione iniziale
            velocity: new Vector3(0, 0, 0),   // Velocità iniziale
            radius: PLAYER_RADIUS,            // Raggio del collider
            onFloor: false,                   // Indica se il giocatore è a terra
        };
        this.keyStates = {}; // Stato dei tasti premuti
        this.initControls();
    }

    // Inizializza gli eventi per i controlli del giocatore
    initControls() {
        document.addEventListener('keydown', (event) => {
            this.keyStates[event.code] = true;
        });

        document.addEventListener('keyup', (event) => {
            this.keyStates[event.code] = false;
        });
    }

    // Ottiene il vettore di movimento avanti/indietro
    getForwardVector() {
        const direction = new Vector3();
        this.camera.getWorldDirection(direction);
        direction.y = 0; // Mantieni il movimento sul piano orizzontale
        return direction.normalize();
    }

    // Ottiene il vettore di movimento laterale
    getSideVector() {
        const direction = new Vector3();
        this.camera.getWorldDirection(direction);
        direction.y = 0; // Mantieni il movimento sul piano orizzontale
        direction.normalize();
        return direction.cross(new Vector3(0, 1, 0)); // Vettore verso l'alto
    }

    // Aggiorna la posizione del giocatore in base ai controlli
    update(deltaTime, collisionObjects) {
        const speed = this.collider.onFloor ? 8 : 2; // Velocità diversa a terra o in aria
        const movement = new Vector3();

        if (this.keyStates['KeyW']) movement.add(this.getForwardVector().multiplyScalar(speed * deltaTime));
        if (this.keyStates['KeyS']) movement.add(this.getForwardVector().multiplyScalar(-speed * deltaTime));
        if (this.keyStates['KeyA']) movement.add(this.getSideVector().multiplyScalar(-speed * deltaTime));
        if (this.keyStates['KeyD']) movement.add(this.getSideVector().multiplyScalar(speed * deltaTime));

        if (this.collider.onFloor && this.keyStates['Space']) {
            this.collider.velocity.y = JUMP_VELOCITY; // Salta solo se il giocatore è a terra
        }

        this.collider.velocity.add(movement);

        // Applica gravità se il giocatore non è a terra
        if (!this.collider.onFloor) {
            this.collider.velocity.y -= GRAVITY * deltaTime;
        }

        // Applica attrito
        this.collider.velocity.multiplyScalar(FRICTION);

        // Calcola la nuova posizione
        const deltaPosition = this.collider.velocity.clone().multiplyScalar(deltaTime);
        this.collider.position.add(deltaPosition);

        // Controlla le collisioni
        this.checkCollisions(collisionObjects);

        // Aggiorna la posizione della camera
        this.camera.position.copy(this.collider.position);
    }

    // Controlla le collisioni con oggetti della scena
    checkCollisions(collisionObjects) {
        this.collider.onFloor = false; // Resetta lo stato "a terra"

        collisionObjects.forEach((object) => {
            const boundingBox = new THREE.Box3().setFromObject(object);
            const playerBox = new THREE.Box3(
                new THREE.Vector3(
                    this.collider.position.x - this.collider.radius,
                    this.collider.position.y - this.collider.radius,
                    this.collider.position.z - this.collider.radius
                ),
                new THREE.Vector3(
                    this.collider.position.x + this.collider.radius,
                    this.collider.position.y + this.collider.radius,
                    this.collider.position.z + this.collider.radius
                )
            );

            if (boundingBox.intersectsBox(playerBox)) {
                const collisionNormal = boundingBox.getCenter(new THREE.Vector3())
                    .sub(this.collider.position)
                    .normalize();
                this.collider.onFloor = collisionNormal.y > 0;

                // Risolvi la penetrazione
                const depth = boundingBox.distanceToPoint(this.collider.position);
                if (depth > 0) {
                    this.collider.position.add(collisionNormal.multiplyScalar(depth));
                }

                // Correggi la velocità del giocatore
                if (!this.collider.onFloor) {
                    this.collider.velocity.addScaledVector(collisionNormal, -collisionNormal.dot(this.collider.velocity));
                }
            }
        });
    }

    // Riporta il giocatore all'interno della scena se cade fuori
    teleportIfOutOfBounds(bounds = { minY: -20 }) {
        if (this.collider.position.y <= bounds.minY) {
            this.collider.position.set(0, 0.35, 0); // Riporta il giocatore alla posizione iniziale
            this.collider.velocity.set(0, 0, 0);   // Resetta la velocità
        }
    }
}
