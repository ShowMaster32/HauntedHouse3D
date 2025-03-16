// physics.js
// Sistema fisico per movimento, collisioni e interazioni

class PhysicsSystem {
    constructor() {
        // Costanti fisiche
        this.GRAVITY = GAME_CONSTANTS.PHYSICS.GRAVITY || 30;
        this.PLAYER_HEIGHT = GAME_CONSTANTS.PLAYER.HEIGHT || 4;
        this.PLAYER_RADIUS = GAME_CONSTANTS.PLAYER.RADIUS || 0.35;
        this.COLLISION_SEGMENTS = 8;
        
        // Vettore velocità del giocatore
        this.playerVelocity = [0, 0, 0];
        this.playerOnFloor = false;
        
        // Collision bounding boxes per oggetti statici
        this.boundingBoxes = [];
        
        // Capsula del giocatore (per collisioni più precise)
        this.playerCapsule = {
            start: [0, 0.35, 0],
            end: [0, this.PLAYER_HEIGHT, 0],
            radius: this.PLAYER_RADIUS
        };
        
        // Log di inizializzazione
        this.log('Sistema fisico inizializzato');
    }
    
    // Funzione di log
    log(message, isError = false) {
        console.log(isError ? `[PHYSICS ERROR] ${message}` : `[PHYSICS] ${message}`);
        
        if (typeof logDebug === 'function') {
            logDebug(message, isError ? 'error' : 'info');
        }
    }
    
    // Inizializza la geometria di collisione per la stanza
    initializeCollisionGeometry(roomWidth, roomHeight, roomDepth, wallThickness) {
        this.log(`Inizializzazione geometria di collisione: ${roomWidth}x${roomHeight}x${roomDepth}`);
        
        // Aggiungi bounding box per le pareti
        this.boundingBoxes = [
            // Pavimento
            {
                min: [-roomWidth/2, -0.1, -roomDepth/2],
                max: [roomWidth/2, 0, roomDepth/2]
            },
            // Soffitto
            {
                min: [-roomWidth/2, roomHeight, -roomDepth/2],
                max: [roomWidth/2, roomHeight + 0.1, roomDepth/2]
            },
            // Parete frontale
            {
                min: [-roomWidth/2, 0, -roomDepth/2],
                max: [roomWidth/2, roomHeight, -roomDepth/2 + wallThickness]
            },
            // Parete posteriore
            {
                min: [-roomWidth/2, 0, roomDepth/2 - wallThickness],
                max: [roomWidth/2, roomHeight, roomDepth/2]
            },
            // Parete sinistra
            {
                min: [-roomWidth/2, 0, -roomDepth/2],
                max: [-roomWidth/2 + wallThickness, roomHeight, roomDepth/2]
            },
            // Parete destra
            {
                min: [roomWidth/2 - wallThickness, 0, -roomDepth/2],
                max: [roomWidth/2, roomHeight, roomDepth/2]
            }
        ];
        
        this.log(`Aggiunte ${this.boundingBoxes.length} bounding box per collisioni`);
    }
    
    // Aggiungi una scatola di collisione
    addCollisionBox(min, max) {
        this.boundingBoxes.push({ min, max });
        this.log(`Aggiunta bounding box da [${min}] a [${max}]`);
    }
    
    // Controlla collisione tra una capsula (player) e una box (ambiente)
    checkCapsuleCollision(capsule, box) {
        // Ottieni il punto più vicino sulla box alla capsula
        const closestPoint = this.getClosestPointOnSegment(box, capsule.start, capsule.end);
        const distance = this.getDistance(closestPoint, capsule.start);
        
        // Se il punto è all'interno del raggio della capsula, c'è collisione
        if (distance < capsule.radius) {
            // Calcola la normale di collisione
            const normal = this.normalize([
                capsule.start[0] - closestPoint[0],
                capsule.start[1] - closestPoint[1],
                capsule.start[2] - closestPoint[2]
            ]);
            
            // Calcola la profondità di penetrazione
            const depth = capsule.radius - distance;
            
            return {
                normal: normal,
                depth: depth
            };
        }
        
        // Nessuna collisione
        return null;
    }
    
    // Trova il punto più vicino su un segmento a una box
    getClosestPointOnSegment(box, start, end) {
        // Prima troviamo il punto più vicino della box alla linea
        const closest = [
            Math.max(box.min[0], Math.min(Math.max(start[0], end[0]), box.max[0])),
            Math.max(box.min[1], Math.min(Math.max(start[1], end[1]), box.max[1])),
            Math.max(box.min[2], Math.min(Math.max(start[2], end[2]), box.max[2]))
        ];
        
        // Per il pavimento, forza l'altezza minima
        if (closest[1] <= 0.35) {
            closest[1] = 0.35;
            this.playerOnFloor = true;
            return closest;
        }
        
        // Calcola la direzione del segmento della capsula
        const direction = this.normalize([
            end[0] - start[0],
            end[1] - start[1],
            end[2] - start[2]
        ]);
        
        // Proietta il punto più vicino sul segmento
        const toClosest = [
            closest[0] - start[0],
            closest[1] - start[1],
            closest[2] - start[2]
        ];
        
        const dot = this.dot(toClosest, direction);
        const length = this.getDistance(start, end);
        
        // Limita il punto al segmento
        if (dot < 0) return start;
        if (dot > length) return end;
        
        return [
            start[0] + direction[0] * dot,
            start[1] + direction[1] * dot,
            start[2] + direction[2] * dot
        ];
    }
    
    // Calcola la distanza tra due punti
    getDistance(a, b) {
        return Math.sqrt(
            (b[0] - a[0]) * (b[0] - a[0]) +
            (b[1] - a[1]) * (b[1] - a[1]) +
            (b[2] - a[2]) * (b[2] - a[2])
        );
    }
    
    // Normalizza un vettore
    normalize(vector) {
        const length = Math.sqrt(
            vector[0] * vector[0] +
            vector[1] * vector[1] +
            vector[2] * vector[2]
        );
        
        if (length === 0) return vector;
        
        return [
            vector[0] / length,
            vector[1] / length,
            vector[2] / length
        ];
    }
    
    // Calcola il prodotto scalare di due vettori
    dot(a, b) {
        return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    }
    
    // Aggiorna la fisica del giocatore
    update(deltaTime, playerPosition) {
        // Forza altezza minima (player non può andare sotto il pavimento)
        if (playerPosition[1] < 0.35) {
            playerPosition[1] = 0.35;
            this.playerOnFloor = true;
            this.playerVelocity[1] = 0;
        }
        
        // Applica gravità se non sul pavimento
        if (!this.playerOnFloor) {
            this.playerVelocity[1] -= this.GRAVITY * deltaTime;
        }
        
        // Aggiorna la posizione della capsula del giocatore
        this.playerCapsule.start = [
            playerPosition[0],
            playerPosition[1],
            playerPosition[2]
        ];
        
        this.playerCapsule.end = [
            playerPosition[0],
            playerPosition[1] + this.PLAYER_HEIGHT,
            playerPosition[2]
        ];
        
        // Applica velocità
        const newPosition = [
            playerPosition[0] + this.playerVelocity[0] * deltaTime,
            playerPosition[1] + this.playerVelocity[1] * deltaTime,
            playerPosition[2] + this.playerVelocity[2] * deltaTime
        ];
        
        // Controlla collisioni con tutti i boundingBoxes
        this.playerOnFloor = false;
        let finalPosition = [...newPosition];
        
        for (const box of this.boundingBoxes) {
            const collision = this.checkCapsuleCollision(this.playerCapsule, box);
            if (collision) {
                // Risolvi collisione
                finalPosition[0] += collision.normal[0] * collision.depth;
                finalPosition[1] += collision.normal[1] * collision.depth;
                finalPosition[2] += collision.normal[2] * collision.depth;
                
                // Aggiorna velocità (rimbalzo)
                const dot = this.dot(this.playerVelocity, collision.normal);
                this.playerVelocity[0] -= collision.normal[0] * dot;
                this.playerVelocity[1] -= collision.normal[1] * dot;
                this.playerVelocity[2] -= collision.normal[2] * dot;
                
                // Controlla se siamo sul pavimento
                if (collision.normal[1] > 0.7) {
                    this.playerOnFloor = true;
                }
            }
        }
        
        // Applica damping (resistenza dell'aria)
        const damping = Math.exp(-4 * deltaTime) - 1;
        this.playerVelocity[0] *= 1 + damping;
        this.playerVelocity[1] *= 1 + damping * 0.5; // Meno damping verticale
        this.playerVelocity[2] *= 1 + damping;
        
        return finalPosition;
    }
    
    // Fa saltare il player
    jump() {
        if (this.playerOnFloor) {
            this.playerVelocity[1] = GAME_CONSTANTS.PHYSICS.JUMP_FORCE || 10;
            this.playerOnFloor = false;
            this.log('Player salta');
        }
    }
    
    // Aggiunge un impulso al player
    addImpulse(direction, force) {
        this.playerVelocity[0] += direction[0] * force;
        this.playerVelocity[1] += direction[1] * force;
        this.playerVelocity[2] += direction[2] * force;
    }
    
    // Ottiene il vettore forward basato sulla rotazione della camera
    getForwardVector(camera) {
        const forward = [0, 0, -1];
        const cosy = Math.cos(camera.rotation[1]);
        const siny = Math.sin(camera.rotation[1]);
        
        return [
            forward[0] * cosy - forward[2] * siny,
            0,
            forward[0] * siny + forward[2] * cosy
        ];
    }
    
    // Ottiene il vettore right basato sulla rotazione della camera
    getRightVector(camera) {
        const forward = this.getForwardVector(camera);
        return [
            -forward[2],
            0,
            forward[0]
        ];
    }
    
    // Muove il player nella direzione specificata
    movePlayer(direction, camera, speed) {
        let moveVector;
        
        switch (direction) {
            case 'forward':
                moveVector = this.getForwardVector(camera);
                break;
            case 'backward':
                moveVector = this.getForwardVector(camera);
                moveVector = moveVector.map(v => -v);
                break;
            case 'left':
                moveVector = this.getRightVector(camera);
                moveVector = moveVector.map(v => -v);
                break;
            case 'right':
                moveVector = this.getRightVector(camera);
                break;
            default:
                return;
        }
        
        // Applica l'impulso
        this.addImpulse(moveVector, speed);
    }
    
    // Teleporta il player se esce dai limiti
    teleportPlayerIfOob(playerPosition) {
        // Teleport player if they fall out of bounds
        if (playerPosition[1] <= -20) {
            this.log('Player fuori dai limiti, teleported alla posizione iniziale');
            return {
                position: [0, 0.35, 0],
                rotation: [0, 0, 0]
            };
        }
        return null;
    }
}

// Esporta la classe
window.PhysicsSystem = PhysicsSystem;