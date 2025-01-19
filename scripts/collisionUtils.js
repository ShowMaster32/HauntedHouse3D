// collisionUtils.js
import { Vector3 } from './math.js';

/**
 * Verifica la collisione tra una sfera e un piano
 * @param {Object} sphere - Sfera {position: Vector3, radius: number}
 * @param {Object} plane - Piano {normal: Vector3, position: Vector3}
 * @returns {Object} Informazioni sulla collisione
 */
export function spherePlaneCollision(sphere, plane) {
    // Calcola la distanza dal piano
    const distance = plane.normal.dot(
        sphere.position.clone().subtract(plane.position)
    );
    
    return {
        collided: Math.abs(distance) <= sphere.radius,
        penetration: sphere.radius - Math.abs(distance),
        normal: plane.normal.clone(),
        point: sphere.position.clone().subtract(
            plane.normal.clone().multiply(distance)
        )
    };
}

/**
 * Verifica la collisione tra una sfera e una scatola (AABB)
 * @param {Object} sphere - Sfera {position: Vector3, radius: number}
 * @param {Object} box - Scatola {min: Vector3, max: Vector3}
 * @returns {Object} Informazioni sulla collisione
 */
export function sphereBoxCollision(sphere, box) {
    // Trova il punto più vicino sulla scatola
    const closest = new Vector3(
        Math.max(box.min.x, Math.min(sphere.position.x, box.max.x)),
        Math.max(box.min.y, Math.min(sphere.position.y, box.max.y)),
        Math.max(box.min.z, Math.min(sphere.position.z, box.max.z))
    );
    
    // Calcola la distanza quadrata
    const distanceSquared = closest.clone()
        .subtract(sphere.position)
        .lengthSquared();
    
    const collision = {
        collided: distanceSquared <= (sphere.radius * sphere.radius),
        distance: Math.sqrt(distanceSquared),
        normal: new Vector3(0, 0, 0),
        point: closest
    };
    
    if (collision.collided) {
        collision.normal = closest.clone()
            .subtract(sphere.position)
            .normalize()
            .multiply(-1);
        collision.penetration = sphere.radius - collision.distance;
    }
    
    return collision;
}

/**
 * Verifica la collisione tra una capsula e un piano
 * @param {Object} capsule - Capsula {start: Vector3, end: Vector3, radius: number}
 * @param {Object} plane - Piano {normal: Vector3, position: Vector3}
 * @returns {Object} Informazioni sulla collisione
 */
export function capsulePlaneCollision(capsule, plane) {
    // Calcola la distanza minima tra la linea della capsula e il piano
    const startDist = plane.normal.dot(
        capsule.start.clone().subtract(plane.position)
    );
    const endDist = plane.normal.dot(
        capsule.end.clone().subtract(plane.position)
    );
    
    const penetration = Math.min(
        capsule.radius - Math.abs(startDist),
        capsule.radius - Math.abs(endDist)
    );
    
    return {
        collided: penetration > 0,
        penetration: penetration,
        normal: plane.normal.clone(),
        point: startDist < endDist ? capsule.start.clone() : capsule.end.clone()
    };
}

/**
 * Verifica la collisione tra una capsula e una scatola (AABB)
 * @param {Object} capsule - Capsula {start: Vector3, end: Vector3, radius: number}
 * @param {Object} box - Scatola {min: Vector3, max: Vector3}
 * @returns {Object} Informazioni sulla collisione
 */
export function capsuleBoxCollision(capsule, box) {
    // Converti la capsula in una serie di sfere e verifica le collisioni
    const direction = capsule.end.clone().subtract(capsule.start);
    const length = direction.length();
    const steps = Math.ceil(length / capsule.radius);
    const stepSize = length / steps;
    
    let collision = {
        collided: false,
        penetration: 0,
        normal: new Vector3(0, 0, 0),
        point: new Vector3(0, 0, 0)
    };
    
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const position = capsule.start.clone().add(
            direction.clone().multiply(t)
        );
        
        const sphereCollision = sphereBoxCollision(
            { position, radius: capsule.radius },
            box
        );
        
        if (sphereCollision.collided && 
            sphereCollision.penetration > collision.penetration) {
            collision = sphereCollision;
        }
    }
    
    return collision;
}

/**
 * Ottimizza un insieme di collisioni per prevenire duplicati
 * @param {Array} collisions - Array di collisioni
 * @returns {Array} Collisioni ottimizzate
 */
export function optimizeCollisions(collisions) {
    // Raggruppa le collisioni per oggetto
    const grouped = {};
    
    collisions.forEach(collision => {
        const key = collision.object.id;
        if (!grouped[key] || collision.penetration > grouped[key].penetration) {
            grouped[key] = collision;
        }
    });
    
    return Object.values(grouped);
}

/**
 * Crea una bounding box da un insieme di vertici
 * @param {Float32Array} vertices - Array di vertici
 * @returns {Object} Bounding box {min: Vector3, max: Vector3}
 */
export function createBoundingBox(vertices) {
    const min = new Vector3(Infinity, Infinity, Infinity);
    const max = new Vector3(-Infinity, -Infinity, -Infinity);
    
    for (let i = 0; i < vertices.length; i += 3) {
        min.x = Math.min(min.x, vertices[i]);
        min.y = Math.min(min.y, vertices[i + 1]);
        min.z = Math.min(min.z, vertices[i + 2]);
        
        max.x = Math.max(max.x, vertices[i]);
        max.y = Math.max(max.y, vertices[i + 1]);
        max.z = Math.max(max.z, vertices[i + 2]);
    }
    
    return { min, max };
}

/**
 * Calcola la distanza minima tra un punto e una linea
 * @param {Vector3} point - Punto
 * @param {Vector3} lineStart - Punto iniziale della linea
 * @param {Vector3} lineEnd - Punto finale della linea
 * @returns {number} Distanza minima
 */
export function pointLineDistance(point, lineStart, lineEnd) {
    const line = lineEnd.clone().subtract(lineStart);
    const len = line.length();
    line.normalize();
    
    const v = point.clone().subtract(lineStart);
    const d = v.dot(line);
    
    if (d <= 0) return point.clone().subtract(lineStart).length();
    if (d >= len) return point.clone().subtract(lineEnd).length();
    
    return v.subtract(line.multiply(d)).length();
}