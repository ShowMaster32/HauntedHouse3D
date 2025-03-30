// physics.js
// Sistema fisico per movimento, collisioni e interazioni

class PhysicsSystem {
    constructor() {
        // Costanti fisiche
        this.GRAVITY = GAME_CONSTANTS.PHYSICS.GRAVITY || 30;
        this.PLAYER_HEIGHT = GAME_CONSTANTS.PLAYER.HEIGHT || 4;
        this.PLAYER_RADIUS = GAME_CONSTANTS.PLAYER.RADIUS || 0.35;
        
        // Stato fisico del giocatore
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
    
    // Verifica se un punto è all'interno di una box
    pointInBox(point, box) {
        return (point[0] >= box.min[0] && point[0] <= box.max[0] &&
                point[1] >= box.min[1] && point[1] <= box.max[1] &&
                point[2] >= box.min[2] && point[2] <= box.max[2]);
    }
    
    // Trova il punto più vicino su una box a un punto dato
    closestPointOnBox(point, box) {
        const result = [0, 0, 0];
        
        // Per ogni dimensione (x, y, z)
        for (let i = 0; i < 3; i++) {
            if (point[i] < box.min[i]) {
                result[i] = box.min[i];
            } else if (point[i] > box.max[i]) {
                result[i] = box.max[i];
            } else {
                result[i] = point[i];
            }
        }
        
        return result;
    }
    
    // Calcola la distanza tra due punti 3D
    distance(a, b) {
        return Math.sqrt(
            (b[0] - a[0]) * (b[0] - a[0]) +
            (b[1] - a[1]) * (b[1] - a[1]) +
            (b[2] - a[2]) * (b[2] - a[2])
        );
    }
    
    // Verifica collisione tra una sfera e una box
    sphereBoxCollision(center, radius, box) {
        // Trova il punto più vicino sulla box alla sfera
        const closestPoint = this.closestPointOnBox(center, box);
        
        // Calcola la distanza tra il centro della sfera e il punto più vicino
        const distance = this.distance(center, closestPoint);
        
        // Se la distanza è minore del raggio, c'è collisione
        return distance < radius;
    }
    
    // Calcola la normale di collisione tra una sfera e una box
    sphereBoxCollisionNormal(center, radius, box) {
        // Trova il punto più vicino sulla box alla sfera
        const closestPoint = this.closestPointOnBox(center, box);
        
        // Calcola la distanza
        const distance = this.distance(center, closestPoint);
        
        // Se c'è collisione, calcola la normale
        if (distance < radius) {
            // Direzione dal punto più vicino al centro della sfera
            const normal = [
                center[0] - closestPoint[0],
                center[1] - closestPoint[1],
                center[2] - closestPoint[2]
            ];
            
            // Normalizza
            const len = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]);
            if (len > 0) {
                normal[0] /= len;
                normal[1] /= len;
                normal[2] /= len;
            }
            
            return {
                normal: normal,
                depth: radius - distance
            };
        }
        
        return null;
    }
    
    // Risolve le collisioni per il giocatore
    resolvePlayerCollisions(position, velocity) {
        // Collisione con il pavimento
        if (position[1] < this.PLAYER_RADIUS) {
            position[1] = this.PLAYER_RADIUS;
            velocity[1] = 0;
            this.playerOnFloor = true;
            return true;
        }
        
        this.playerOnFloor = false;
        
        // Aggiorna la capsula del giocatore
        this.playerCapsule.start = [position[0], position[1] - this.PLAYER_RADIUS, position[2]];
        this.playerCapsule.end = [position[0], position[1] + this.PLAYER_HEIGHT - this.PLAYER_RADIUS, position[2]];
        
        let collided = false;
        
        // Verifica collisioni con tutte le bounding box
        for (const box of this.boundingBoxes) {
            // Verifica collisione con l'estremità inferiore della capsula
            const bottomCollision = this.sphereBoxCollisionNormal(this.playerCapsule.start, this.PLAYER_RADIUS, box);
            if (bottomCollision) {
                // Risolvi collisione
                position[0] += bottomCollision.normal[0] * bottomCollision.depth;
                position[1] += bottomCollision.normal[1] * bottomCollision.depth;
                position[2] += bottomCollision.normal[2] * bottomCollision.depth;
                
                // Aggiorna velocità per rimbalzo
                const dot = velocity[0] * bottomCollision.normal[0] + 
                            velocity[1] * bottomCollision.normal[1] + 
                            velocity[2] * bottomCollision.normal[2];
                
                velocity[0] -= bottomCollision.normal[0] * dot;
                velocity[1] -= bottomCollision.normal[1] * dot;
                velocity[2] -= bottomCollision.normal[2] * dot;
                
                // Se la normale è prevalentemente verso l'alto, siamo sul pavimento
                if (bottomCollision.normal[1] > 0.7) {
                    this.playerOnFloor = true;
                }
                
                collided = true;
            }
            
            // Verifica collisione con l'estremità superiore della capsula
            const topCollision = this.sphereBoxCollisionNormal(this.playerCapsule.end, this.PLAYER_RADIUS, box);
            if (topCollision) {
                // Risolvi collisione
                position[0] += topCollision.normal[0] * topCollision.depth;
                position[1] += topCollision.normal[1] * topCollision.depth;
                position[2] += topCollision.normal[2] * topCollision.depth;
                
                // Aggiorna velocità per rimbalzo
                const dot = velocity[0] * topCollision.normal[0] + 
                            velocity[1] * topCollision.normal[1] + 
                            velocity[2] * topCollision.normal[2];
                
                velocity[0] -= topCollision.normal[0] * dot;
                velocity[1] -= topCollision.normal[1] * dot;
                velocity[2] -= topCollision.normal[2] * dot;
                
                collided = true;
            }
        }
        
        return collided;
    }
    
    // Aggiorna la fisica del giocatore
    update(deltaTime, position, velocity) {
        // Clona i vettori per non modificare gli originali
        const newPosition = [...position];
        const newVelocity = [...velocity];
        
        // Applica gravità se non sul pavimento
        if (!this.playerOnFloor) {
            newVelocity[1] -= this.GRAVITY * deltaTime;
        }
        
        // Applica smorzamento (damping)
        const damping = this.playerOnFloor ? 0.9 : 0.98;
        newVelocity[0] *= damping;
        newVelocity[2] *= damping;
        
        // Limita la velocità massima sul piano XZ
        const horizontalSpeed = Math.sqrt(newVelocity[0] * newVelocity[0] + newVelocity[2] * newVelocity[2]);
        const maxSpeed = 5.0; // Velocità massima
        
        if (horizontalSpeed > maxSpeed) {
            const scale = maxSpeed / horizontalSpeed;
            newVelocity[0] *= scale;
            newVelocity[2] *= scale;
        }
        
        // Applica velocità alla posizione
        newPosition[0] += newVelocity[0] * deltaTime;
        newPosition[1] += newVelocity[1] * deltaTime;
        newPosition[2] += newVelocity[2] * deltaTime;
        
        // Risolvi collisioni
        this.resolvePlayerCollisions(newPosition, newVelocity);
        
        // Ritorna la nuova posizione e velocità
        return {
            position: newPosition,
            velocity: newVelocity,
            onFloor: this.playerOnFloor
        };
    }
    
    // Teleporta il giocatore se esce dai limiti
    teleportPlayerIfOob(position) {
        // Teleport player if they fall out of bounds
        if (position[1] <= -20) {
            this.log('Player fuori dai limiti, teleported alla posizione iniziale');
            return {
                position: [0, 0.35, 0],
                rotation: [0, 0, 0]
            };
        }
        return null;
    }
}

// Rendi disponibile globalmente
window.PhysicsSystem = PhysicsSystem;