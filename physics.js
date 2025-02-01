// physics.js
class PhysicsSystem {
    constructor() {
        this.GRAVITY = 30;
        this.PLAYER_HEIGHT = 4;
        this.PLAYER_RADIUS = 0.35;
        this.COLLISION_SEGMENTS = 8;
        
        this.playerVelocity = [0, 0, 0];
        this.playerOnFloor = false;
        
        // Collision bounding boxes per oggetti statici
        this.boundingBoxes = [];
        
        // Capsule del giocatore (per collisioni più precise)
        this.playerCapsule = {
            start: [0, 0.35, 0],
            end: [0, 4, 0],
            radius: 0.35
        };
    }

    initializeCollisionGeometry(roomWidth, roomHeight, roomDepth, wallThickness) {
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
    }

    addCollisionBox(min, max) {
        this.boundingBoxes.push({ min, max });
    }

    checkCapsuleCollision(capsule, box) {
        // Controlla collisione tra una capsula (player) e una box (ambiente)
        const closestPoint = this.getClosestPointOnSegment(box, capsule.start, capsule.end);
        const distance = this.getDistance(closestPoint, capsule.start);
        
        if (distance < capsule.radius) {
            const normal = this.normalize([
                capsule.start[0] - closestPoint[0],
                capsule.start[1] - closestPoint[1],
                capsule.start[2] - closestPoint[2]
            ]);
            
            return {
                normal: normal,
                depth: capsule.radius - distance
            };
        }
        
        return null;
    }

    getClosestPointOnSegment(box, start, end) {
        // Trova il punto più vicino sul segmento della capsula alla box
        const direction = this.normalize([
            end[0] - start[0],
            end[1] - start[1],
            end[2] - start[2]
        ]);
        
        let closest = [
            Math.max(box.min[0], Math.min(start[0], box.max[0])),
            Math.max(box.min[1], Math.min(start[1], box.max[1])),
            Math.max(box.min[2], Math.min(start[2], box.max[2]))
        ];
        
        const dot = this.dot(
            [closest[0] - start[0], closest[1] - start[1], closest[2] - start[2]],
            direction
        );
        
        if (dot < 0) {
            return start;
        }
        
        const length = this.getDistance(start, end);
        if (dot > length) {
            return end;
        }
        
        return [
            start[0] + direction[0] * dot,
            start[1] + direction[1] * dot,
            start[2] + direction[2] * dot
        ];
    }

    getDistance(a, b) {
        return Math.sqrt(
            (b[0] - a[0]) * (b[0] - a[0]) +
            (b[1] - a[1]) * (b[1] - a[1]) +
            (b[2] - a[2]) * (b[2] - a[2])
        );
    }

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

    dot(a, b) {
        return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    }

    update(deltaTime, playerPosition) {
        // Applica gravità
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
        
        // Applica damping
        const damping = Math.exp(-4 * deltaTime) - 1;
        this.playerVelocity[0] *= 1 + damping;
        this.playerVelocity[1] *= 1 + damping;
        this.playerVelocity[2] *= 1 + damping;
        
        return finalPosition;
    }

    jump() {
        if (this.playerOnFloor) {
            this.playerVelocity[1] = 10;
            this.playerOnFloor = false;
        }
    }

    addImpulse(direction, force) {
        this.playerVelocity[0] += direction[0] * force;
        this.playerVelocity[1] += direction[1] * force;
        this.playerVelocity[2] += direction[2] * force;
    }

    getForwardVector(camera) {
        // Calcola il vettore forward basato sulla rotazione della camera
        const forward = [0, 0, -1];
        const cosy = Math.cos(camera.rotation[1]);
        const siny = Math.sin(camera.rotation[1]);
        
        return [
            forward[0] * cosy - forward[2] * siny,
            0,
            forward[0] * siny + forward[2] * cosy
        ];
    }

    getRightVector(camera) {
        // Calcola il vettore right basato sulla rotazione della camera
        const forward = this.getForwardVector(camera);
        return [
            -forward[2],
            0,
            forward[0]
        ];
    }

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
        
        this.addImpulse(moveVector, speed);
    }

    teleportPlayerIfOob(playerPosition) {
        // Teleport player if they fall out of bounds
        if (playerPosition[1] <= -20) {
            return {
                position: [0, 0.35, 0],
                rotation: [0, 0, 0]
            };
        }
        return null;
    }
}

// Esporta la classe
export default PhysicsSystem;