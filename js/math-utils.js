// math-utils.js
// Utilità matematiche per rendering 3D e fisica

// Funzioni vettoriali
window.Vector3 = {
    create: (x = 0, y = 0, z = 0) => new Float32Array([x, y, z]),
    
    add: (a, b, out = new Float32Array(3)) => {
        out[0] = a[0] + b[0];
        out[1] = a[1] + b[1];
        out[2] = a[2] + b[2];
        return out;
    },
    
    subtract: (a, b, out = new Float32Array(3)) => {
        out[0] = a[0] - b[0];
        out[1] = a[1] - b[1];
        out[2] = a[2] - b[2];
        return out;
    },
    
    scale: (v, s, out = new Float32Array(3)) => {
        out[0] = v[0] * s;
        out[1] = v[1] * s;
        out[2] = v[2] * s;
        return out;
    },
    
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    
    cross: (a, b, out = new Float32Array(3)) => {
        const ax = a[0], ay = a[1], az = a[2];
        const bx = b[0], by = b[1], bz = b[2];
        
        out[0] = ay * bz - az * by;
        out[1] = az * bx - ax * bz;
        out[2] = ax * by - ay * bx;
        return out;
    },
    
    length: (v) => Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]),
    
    normalize: (v, out = new Float32Array(3)) => {
        const len = Vector3.length(v);
        if (len > 0) {
            const invLen = 1 / len;
            out[0] = v[0] * invLen;
            out[1] = v[1] * invLen;
            out[2] = v[2] * invLen;
        }
        return out;
    },
    
    distance: (a, b) => {
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        const dz = b[2] - a[2];
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
};

// Funzioni quaternion
window.Quaternion = {
    create: (x = 0, y = 0, z = 0, w = 1) => new Float32Array([x, y, z, w]),
    
    fromEuler: (x, y, z, out = new Float32Array(4)) => {
        const c1 = Math.cos(x / 2);
        const c2 = Math.cos(y / 2);
        const c3 = Math.cos(z / 2);
        const s1 = Math.sin(x / 2);
        const s2 = Math.sin(y / 2);
        const s3 = Math.sin(z / 2);
        
        out[0] = s1 * c2 * c3 + c1 * s2 * s3;
        out[1] = c1 * s2 * c3 - s1 * c2 * s3;
        out[2] = c1 * c2 * s3 + s1 * s2 * c3;
        out[3] = c1 * c2 * c3 - s1 * s2 * s3;
        
        return out;
    },
    
    multiply: (a, b, out = new Float32Array(4)) => {
        const ax = a[0], ay = a[1], az = a[2], aw = a[3];
        const bx = b[0], by = b[1], bz = b[2], bw = b[3];
        
        out[0] = ax * bw + aw * bx + ay * bz - az * by;
        out[1] = ay * bw + aw * by + az * bx - ax * bz;
        out[2] = az * bw + aw * bz + ax * by - ay * bx;
        out[3] = aw * bw - ax * bx - ay * by - az * bz;
        
        return out;
    }
};

// Funzioni di interpolazione
window.Interpolation = {
    lerp: (a, b, t) => a + (b - a) * t,
    
    smoothStep: (min, max, value) => {
        const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
        return x * x * (3 - 2 * x);
    },
    
    clamp: (value, min, max) => Math.max(min, Math.min(max, value))
};

// Funzioni per collisioni
window.Collision = {
    pointInBox: (point, boxMin, boxMax) => {
        return point[0] >= boxMin[0] && point[0] <= boxMax[0] &&
               point[1] >= boxMin[1] && point[1] <= boxMax[1] &&
               point[2] >= boxMin[2] && point[2] <= boxMax[2];
    },
    
    sphereIntersectsBox: (center, radius, boxMin, boxMax) => {
        let dmin = 0;
        
        for (let i = 0; i < 3; i++) {
            if (center[i] < boxMin[i]) {
                const diff = center[i] - boxMin[i];
                dmin += diff * diff;
            } else if (center[i] > boxMax[i]) {
                const diff = center[i] - boxMax[i];
                dmin += diff * diff;
            }
        }
        
        return dmin <= (radius * radius);
    },
    
    rayIntersectsBox: (origin, direction, boxMin, boxMax) => {
        let tmin = (boxMin[0] - origin[0]) / direction[0];
        let tmax = (boxMax[0] - origin[0]) / direction[0];
        
        if (tmin > tmax) [tmin, tmax] = [tmax, tmin];
        
        let tymin = (boxMin[1] - origin[1]) / direction[1];
        let tymax = (boxMax[1] - origin[1]) / direction[1];
        
        if (tymin > tymax) [tymin, tymax] = [tymax, tymin];
        
        if (tmin > tymax || tymin > tmax) return false;
        
        if (tymin > tmin) tmin = tymin;
        if (tymax < tmax) tmax = tymax;
        
        let tzmin = (boxMin[2] - origin[2]) / direction[2];
        let tzmax = (boxMax[2] - origin[2]) / direction[2];
        
        if (tzmin > tzmax) [tzmin, tzmax] = [tzmax, tzmin];
        
        if (tmin > tzmax || tzmin > tmax) return false;
        
        return true;
    },
    
    // Collisione capsula-box
    capsuleIntersectsBox: (capsuleStart, capsuleEnd, radius, boxMin, boxMax) => {
        // Trova il punto più vicino sulla linea della capsula alla box
        const direction = Vector3.subtract(capsuleEnd, capsuleStart);
        const length = Vector3.length(direction);
        Vector3.scale(direction, 1/length, direction);
        
        const closest = Collision.closestPointOnLine(
            boxMin, boxMax,
            capsuleStart,
            direction,
            length
        );
        
        // Verifica se il punto più vicino è all'interno della sfera con raggio 'radius'
        return Vector3.distance(closest, capsuleStart) <= radius;
    },
    
    closestPointOnLine: (boxMin, boxMax, lineStart, lineDir, lineLength) => {
        const closest = Vector3.create();
        for (let i = 0; i < 3; i++) {
            const d = lineDir[i];
            const o = lineStart[i];
            
            if (d === 0) {
                closest[i] = o;
            } else {
                let t = (d > 0 ? boxMin[i] : boxMax[i] - o) / d;
                if (t < 0) t = 0;
                if (t > lineLength) t = lineLength;
                closest[i] = o + t * d;
            }
        }
        return closest;
    }
};

// Funzioni per matrici 4x4 (integrazione con m4.js)
window.Matrix4 = {
    create: () => new Float32Array(16),
    
    identity: (out = new Float32Array(16)) => {
        out.fill(0);
        out[0] = out[5] = out[10] = out[15] = 1;
        return out;
    },
    
    // Utilizza m4.multiply se disponibile, altrimenti implementa la propria versione
    multiply: (a, b, out = new Float32Array(16)) => {
        if (typeof m4 !== 'undefined' && typeof m4.multiply === 'function') {
            return m4.multiply(a, b);
        }
        
        const a00 = a[0],  a01 = a[1],  a02 = a[2],  a03 = a[3];
        const a10 = a[4],  a11 = a[5],  a12 = a[6],  a13 = a[7];
        const a20 = a[8],  a21 = a[9],  a22 = a[10], a23 = a[11];
        const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
        
        let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
        out[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
        out[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
        out[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
        out[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
        
        b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
        out[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
        out[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
        out[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
        out[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
        
        b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
        out[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
        out[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
        out[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
        out[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
        
        b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
        out[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
        out[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
        out[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
        out[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
        
        return out;
    },
    
    // Matrice di proiezione prospettica
    perspective: (fovy, aspect, near, far, out = new Float32Array(16)) => {
        if (typeof m4 !== 'undefined' && typeof m4.perspective === 'function') {
            return m4.perspective(fovy, aspect, near, far);
        }
        
        const f = 1.0 / Math.tan(fovy / 2);
        out[0] = f / aspect;
        out[1] = 0;
        out[2] = 0;
        out[3] = 0;
        out[4] = 0;
        out[5] = f;
        out[6] = 0;
        out[7] = 0;
        out[8] = 0;
        out[9] = 0;
        out[11] = -1;
        out[12] = 0;
        out[13] = 0;
        out[15] = 0;
        
        const nf = 1 / (near - far);
        out[10] = (far + near) * nf;
        out[14] = 2 * far * near * nf;
        
        return out;
    },
    
    // Matrice lookAt per la camera
    lookAt: (eye, center, up, out = new Float32Array(16)) => {
        if (typeof m4 !== 'undefined' && typeof m4.lookAt === 'function') {
            return m4.lookAt(eye, center, up);
        }
        
        const z = Vector3.normalize(Vector3.subtract(eye, center));
        const x = Vector3.normalize(Vector3.cross(up, z));
        const y = Vector3.cross(z, x);
        
        out[0] = x[0]; out[1] = y[0]; out[2] = z[0]; out[3] = 0;
        out[4] = x[1]; out[5] = y[1]; out[6] = z[1]; out[7] = 0;
        out[8] = x[2]; out[9] = y[2]; out[10] = z[2]; out[11] = 0;
        out[12] = -Vector3.dot(x, eye);
        out[13] = -Vector3.dot(y, eye);
        out[14] = -Vector3.dot(z, eye);
        out[15] = 1;
        
        return out;
    }
};

// Utility per random e rumore
window.Random = {
    // Genera un numero random in un range
    range: (min, max) => min + Math.random() * (max - min),
    
    // Genera un intero random in un range
    rangeInt: (min, max) => Math.floor(min + Math.random() * (max - min + 1)),
    
    // Genera un punto random in una sfera
    pointInSphere: (radius) => {
        const theta = 2 * Math.PI * Math.random();
        const phi = Math.acos(2 * Math.random() - 1);
        const r = radius * Math.cbrt(Math.random());
        
        return Vector3.create(
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.sin(phi) * Math.sin(theta),
            r * Math.cos(phi)
        );
    },
    
    // Genera un quaternione casuale per rotazioni random
    randomQuaternion: () => {
        const u1 = Math.random();
        const u2 = Math.random();
        const u3 = Math.random();
        
        return Quaternion.create(
            Math.sqrt(1 - u1) * Math.sin(2 * Math.PI * u2),
            Math.sqrt(1 - u1) * Math.cos(2 * Math.PI * u2),
            Math.sqrt(u1) * Math.sin(2 * Math.PI * u3),
            Math.sqrt(u1) * Math.cos(2 * Math.PI * u3)
        );
    }
};

// Utility per conversione tra gradi e radianti
window.MathUtils = {
    DEG_TO_RAD: Math.PI / 180,
    RAD_TO_DEG: 180 / Math.PI,
    
    toRadians: (degrees) => degrees * (Math.PI / 180),
    toDegrees: (radians) => radians * (180 / Math.PI),
    
    // Interpolazione sferica di quaternioni
    slerp: (qa, qb, t) => {
        // Copiamo i quaternioni per non modificarli
        let a = Quaternion.create(qa[0], qa[1], qa[2], qa[3]);
        let b = Quaternion.create(qb[0], qb[1], qb[2], qb[3]);
        
        // Calcola coseno dell'angolo tra i quaternioni
        let cosHalfTheta = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
        
        // Se i quaternioni sono troppo simili, fai interpolazione lineare
        if (Math.abs(cosHalfTheta) >= 1.0) {
            return a;
        }
        
        // Assicurati di prendere il percorso più breve
        if (cosHalfTheta < 0) {
            b[0] = -b[0];
            b[1] = -b[1];
            b[2] = -b[2];
            b[3] = -b[3];
            cosHalfTheta = -cosHalfTheta;
        }
        
        // Calcola coefficienti di interpolazione
        const halfTheta = Math.acos(cosHalfTheta);
        const sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta);
        
        // Se l'angolo è troppo piccolo, fai interpolazione lineare
        if (Math.abs(sinHalfTheta) < 0.001) {
            return Quaternion.create(
                (a[0] * 0.5 + b[0] * 0.5),
                (a[1] * 0.5 + b[1] * 0.5),
                (a[2] * 0.5 + b[2] * 0.5),
                (a[3] * 0.5 + b[3] * 0.5)
            );
        }
        
        // Calcola ratios
        const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
        const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;
        
        // Crea risultato
        return Quaternion.create(
            (a[0] * ratioA + b[0] * ratioB),
            (a[1] * ratioA + b[1] * ratioB),
            (a[2] * ratioA + b[2] * ratioB),
            (a[3] * ratioA + b[3] * ratioB)
        );
    }
};

// Esporta gli oggetti nel window
window.Vector3 = Vector3;
window.Quaternion = Quaternion;
window.Matrix4 = Matrix4;
window.Interpolation = Interpolation;
window.Collision = Collision;
window.Random = Random;
window.MathUtils = MathUtils;