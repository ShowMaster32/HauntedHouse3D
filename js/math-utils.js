// math-utils.js
// Utilità matematiche per rendering 3D e fisica

// Funzioni vettoriali
const Vector3 = {
    create: (x = 0, y = 0, z = 0) => [x, y, z],
    
    add: (a, b, out = [0, 0, 0]) => {
        out[0] = a[0] + b[0];
        out[1] = a[1] + b[1];
        out[2] = a[2] + b[2];
        return out;
    },
    
    subtract: (a, b, out = [0, 0, 0]) => {
        out[0] = a[0] - b[0];
        out[1] = a[1] - b[1];
        out[2] = a[2] - b[2];
        return out;
    },
    
    scale: (v, s, out = [0, 0, 0]) => {
        out[0] = v[0] * s;
        out[1] = v[1] * s;
        out[2] = v[2] * s;
        return out;
    },
    
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    
    cross: (a, b, out = [0, 0, 0]) => {
        const ax = a[0], ay = a[1], az = a[2];
        const bx = b[0], by = b[1], bz = b[2];
        
        out[0] = ay * bz - az * by;
        out[1] = az * bx - ax * bz;
        out[2] = ax * by - ay * bx;
        return out;
    },
    
    length: (v) => Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]),
    
    lengthSquared: (v) => v[0] * v[0] + v[1] * v[1] + v[2] * v[2],
    
    normalize: (v, out = [0, 0, 0]) => {
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
    },
    
    distanceSquared: (a, b) => {
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        const dz = b[2] - a[2];
        return dx * dx + dy * dy + dz * dz;
    },
    
    // Ottieni un vettore transformato da una matrice 4x4
    transformMat4: (a, m, out = [0, 0, 0]) => {
        const x = a[0], y = a[1], z = a[2];
        const w = m[3] * x + m[7] * y + m[11] * z + m[15] || 1.0;
        
        out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
        out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
        out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
        
        return out;
    },
    
    // Clona un vettore 3D
    clone: (v) => [v[0], v[1], v[2]],
    
    // Limita la lunghezza di un vettore
    limit: (v, max, out = [0, 0, 0]) => {
        const lengthSq = v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
        if (lengthSq > max * max) {
            const scalar = max / Math.sqrt(lengthSq);
            out[0] = v[0] * scalar;
            out[1] = v[1] * scalar;
            out[2] = v[2] * scalar;
            return out;
        }
        out[0] = v[0];
        out[1] = v[1];
        out[2] = v[2];
        return out;
    },
    
    // Riflette un vettore rispetto a una normale
    reflect: (v, normal, out = [0, 0, 0]) => {
        const dot2 = 2.0 * Vector3.dot(v, normal);
        out[0] = v[0] - dot2 * normal[0];
        out[1] = v[1] - dot2 * normal[1];
        out[2] = v[2] - dot2 * normal[2];
        return out;
    }
};

// Funzioni quaternion
const Quaternion = {
    create: (x = 0, y = 0, z = 0, w = 1) => [x, y, z, w],
    
    fromEuler: (x, y, z, out = [0, 0, 0, 0]) => {
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
    
    multiply: (a, b, out = [0, 0, 0, 0]) => {
        const ax = a[0], ay = a[1], az = a[2], aw = a[3];
        const bx = b[0], by = b[1], bz = b[2], bw = b[3];
        
        out[0] = ax * bw + aw * bx + ay * bz - az * by;
        out[1] = ay * bw + aw * by + az * bx - ax * bz;
        out[2] = az * bw + aw * bz + ax * by - ay * bx;
        out[3] = aw * bw - ax * bx - ay * by - az * bz;
        
        return out;
    },
    
    // Converti quaternione in matrice 3x3 di rotazione
    toMatrix3: (q, out = []) => {
        const x = q[0], y = q[1], z = q[2], w = q[3];
        const x2 = x + x, y2 = y + y, z2 = z + z;
        const xx = x * x2, xy = x * y2, xz = x * z2;
        const yy = y * y2, yz = y * z2, zz = z * z2;
        const wx = w * x2, wy = w * y2, wz = w * z2;
        
        out[0] = 1 - (yy + zz);
        out[1] = xy + wz;
        out[2] = xz - wy;
        
        out[3] = xy - wz;
        out[4] = 1 - (xx + zz);
        out[5] = yz + wx;
        
        out[6] = xz + wy;
        out[7] = yz - wx;
        out[8] = 1 - (xx + yy);
        
        return out;
    },
    
    // Converti da angoli di Eulero (pitch, yaw, roll) a quaternione
    fromYawPitchRoll: (yaw, pitch, roll, out = [0, 0, 0, 0]) => {
        const halfYaw = yaw * 0.5;
        const halfPitch = pitch * 0.5;
        const halfRoll = roll * 0.5;
        
        const sinYaw = Math.sin(halfYaw);
        const cosYaw = Math.cos(halfYaw);
        const sinPitch = Math.sin(halfPitch);
        const cosPitch = Math.cos(halfPitch);
        const sinRoll = Math.sin(halfRoll);
        const cosRoll = Math.cos(halfRoll);
        
        out[0] = cosYaw * sinPitch * cosRoll + sinYaw * cosPitch * sinRoll;
        out[1] = sinYaw * cosPitch * cosRoll - cosYaw * sinPitch * sinRoll;
        out[2] = cosYaw * cosPitch * sinRoll - sinYaw * sinPitch * cosRoll;
        out[3] = cosYaw * cosPitch * cosRoll + sinYaw * sinPitch * sinRoll;
        
        return out;
    }
};

// Funzioni di interpolazione
const Interpolation = {
    lerp: (a, b, t) => a + (b - a) * t,
    
    lerpVec3: (a, b, t, out = [0, 0, 0]) => {
        out[0] = a[0] + (b[0] - a[0]) * t;
        out[1] = a[1] + (b[1] - a[1]) * t;
        out[2] = a[2] + (b[2] - a[2]) * t;
        return out;
    },
    
    smoothStep: (min, max, value) => {
        const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
        return x * x * (3 - 2 * x);
    },
    
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    
    // Interpolazione sferica di quaternion
    slerp: (a, b, t, out = [0, 0, 0, 0]) => {
        // Calcola il coseno dell'angolo tra i quaternioni
        let cosHalfTheta = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
        
        // Se i quaternioni sono troppo simili, usa lerp
        if (Math.abs(cosHalfTheta) >= 1.0) {
            out[0] = a[0];
            out[1] = a[1];
            out[2] = a[2];
            out[3] = a[3];
            return out;
        }
        
        // Assicurati di prendere il percorso più breve
        if (cosHalfTheta < 0) {
            b[0] = -b[0];
            b[1] = -b[1];
            b[2] = -b[2];
            b[3] = -b[3];
            cosHalfTheta = -cosHalfTheta;
        }
        
        const halfTheta = Math.acos(cosHalfTheta);
        const sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta);
        
        // Se l'angolo è troppo piccolo, fai lerp
        if (Math.abs(sinHalfTheta) < 0.001) {
            out[0] = a[0] * 0.5 + b[0] * 0.5;
            out[1] = a[1] * 0.5 + b[1] * 0.5;
            out[2] = a[2] * 0.5 + b[2] * 0.5;
            out[3] = a[3] * 0.5 + b[3] * 0.5;
            return out;
        }
        
        const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
        const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;
        
        out[0] = a[0] * ratioA + b[0] * ratioB;
        out[1] = a[1] * ratioA + b[1] * ratioB;
        out[2] = a[2] * ratioA + b[2] * ratioB;
        out[3] = a[3] * ratioA + b[3] * ratioB;
        
        return out;
    }
};

// Funzioni per collisioni
const Collision = {
    // Test se un punto è dentro un box
    pointInBox: (point, boxMin, boxMax) => {
        return point[0] >= boxMin[0] && point[0] <= boxMax[0] &&
               point[1] >= boxMin[1] && point[1] <= boxMax[1] &&
               point[2] >= boxMin[2] && point[2] <= boxMax[2];
    },
    
    // Test se una sfera interseca un box
    sphereIntersectsBox: (center, radius, boxMin, boxMax) => {
        // Trova il punto più vicino nel box alla sfera
        const closest = [
            Interpolation.clamp(center[0], boxMin[0], boxMax[0]),
            Interpolation.clamp(center[1], boxMin[1], boxMax[1]),
            Interpolation.clamp(center[2], boxMin[2], boxMax[2])
        ];
        
        // Calcola il quadrato della distanza dal punto più vicino al centro della sfera
        const distanceSquared = Vector3.distanceSquared(center, closest);
        
        // Se il quadrato della distanza è minore del quadrato del raggio, c'è intersezione
        return distanceSquared <= (radius * radius);
    },
    
    // Test se un raggio interseca un box
    rayIntersectsBox: (origin, direction, boxMin, boxMax) => {
        // Calcola gli inversi delle componenti della direzione
        const invDir = [
            1.0 / (direction[0] || 0.000001),
            1.0 / (direction[1] || 0.000001),
            1.0 / (direction[2] || 0.000001)
        ];
        
        // Calcola i t per ogni asse
        const t1 = (boxMin[0] - origin[0]) * invDir[0];
        const t2 = (boxMax[0] - origin[0]) * invDir[0];
        const t3 = (boxMin[1] - origin[1]) * invDir[1];
        const t4 = (boxMax[1] - origin[1]) * invDir[1];
        const t5 = (boxMin[2] - origin[2]) * invDir[2];
        const t6 = (boxMax[2] - origin[2]) * invDir[2];
        
        const tMin = Math.max(Math.max(Math.min(t1, t2), Math.min(t3, t4)), Math.min(t5, t6));
        const tMax = Math.min(Math.min(Math.max(t1, t2), Math.max(t3, t4)), Math.max(t5, t6));
        
        // Se tMax < 0, il raggio è diretto lontano dal box
        if (tMax < 0) return false;
        
        // Se tMin > tMax, il raggio non interseca il box
        if (tMin > tMax) return false;
        
        // Altrimenti, il raggio interseca il box
        return true;
    },
    
    // Intersezione tra due box AABB
    boxIntersectsBox: (minA, maxA, minB, maxB) => {
        return minA[0] <= maxB[0] && maxA[0] >= minB[0] &&
               minA[1] <= maxB[1] && maxA[1] >= minB[1] &&
               minA[2] <= maxB[2] && maxA[2] >= minB[2];
    },
    
    // Calcola il punto più vicino su un box a un punto dato
    closestPointOnBox: (point, boxMin, boxMax) => {
        const result = [0, 0, 0];
        
        // Clamp point to box
        for (let i = 0; i < 3; i++) {
            result[i] = Math.max(boxMin[i], Math.min(point[i], boxMax[i]));
        }
        
        return result;
    }
};

// Utilità di mathjs per WebGL
const MatrixUtils = {
    // Crea una matrice di identità 4x4
    identity: () => {
        return [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ];
    },
    
    // Crea una matrice di proiezione prospettica
    perspective: (fovy, aspect, near, far) => {
        const f = 1.0 / Math.tan(fovy / 2);
        const nf = 1 / (near - far);
        
        return [
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (far + near) * nf, -1,
            0, 0, (2 * far * near) * nf, 0
        ];
    },
    
    // Crea una matrice di vista lookAt
    lookAt: (eye, center, up) => {
        const z = Vector3.normalize(Vector3.subtract(eye, center));
        const x = Vector3.normalize(Vector3.cross(up, z));
        const y = Vector3.cross(z, x);
        
        return [
            x[0], y[0], z[0], 0,
            x[1], y[1], z[1], 0,
            x[2], y[2], z[2], 0,
            -Vector3.dot(x, eye), -Vector3.dot(y, eye), -Vector3.dot(z, eye), 1
        ];
    },
    
    // Trasformazione di traslazione
    translate: (matrix, tx, ty, tz) => {
        matrix[12] = matrix[0] * tx + matrix[4] * ty + matrix[8] * tz + matrix[12];
        matrix[13] = matrix[1] * tx + matrix[5] * ty + matrix[9] * tz + matrix[13];
        matrix[14] = matrix[2] * tx + matrix[6] * ty + matrix[10] * tz + matrix[14];
        matrix[15] = matrix[3] * tx + matrix[7] * ty + matrix[11] * tz + matrix[15];
        
        return matrix;
    },
    
    // Trasformazione di scala
    scale: (matrix, sx, sy, sz) => {
        matrix[0] *= sx;
        matrix[1] *= sx;
        matrix[2] *= sx;
        matrix[3] *= sx;
        
        matrix[4] *= sy;
        matrix[5] *= sy;
        matrix[6] *= sy;
        matrix[7] *= sy;
        
        matrix[8] *= sz;
        matrix[9] *= sz;
        matrix[10] *= sz;
        matrix[11] *= sz;
        
        return matrix;
    },
    
    // Rotazione intorno all'asse X
    rotateX: (matrix, angle) => {
        const s = Math.sin(angle);
        const c = Math.cos(angle);
        
        const a10 = matrix[4];
        const a11 = matrix[5];
        const a12 = matrix[6];
        const a13 = matrix[7];
        const a20 = matrix[8];
        const a21 = matrix[9];
        const a22 = matrix[10];
        const a23 = matrix[11];
        
        // Performa la rotazione
        matrix[4] = a10 * c + a20 * s;
        matrix[5] = a11 * c + a21 * s;
        matrix[6] = a12 * c + a22 * s;
        matrix[7] = a13 * c + a23 * s;
        matrix[8] = a20 * c - a10 * s;
        matrix[9] = a21 * c - a11 * s;
        matrix[10] = a22 * c - a12 * s;
        matrix[11] = a23 * c - a13 * s;
        
        return matrix;
    },
    
    // Rotazione intorno all'asse Y
    rotateY: (matrix, angle) => {
        const s = Math.sin(angle);
        const c = Math.cos(angle);
        
        const a00 = matrix[0];
        const a01 = matrix[1];
        const a02 = matrix[2];
        const a03 = matrix[3];
        const a20 = matrix[8];
        const a21 = matrix[9];
        const a22 = matrix[10];
        const a23 = matrix[11];
        
        // Performa la rotazione
        matrix[0] = a00 * c - a20 * s;
        matrix[1] = a01 * c - a21 * s;
        matrix[2] = a02 * c - a22 * s;
        matrix[3] = a03 * c - a23 * s;
        matrix[8] = a00 * s + a20 * c;
        matrix[9] = a01 * s + a21 * c;
        matrix[10] = a02 * s + a22 * c;
        matrix[11] = a03 * s + a23 * c;
        
        return matrix;
    },
    
    // Rotazione intorno all'asse Z
    rotateZ: (matrix, angle) => {
        const s = Math.sin(angle);
        const c = Math.cos(angle);
        
        const a00 = matrix[0];
        const a01 = matrix[1];
        const a02 = matrix[2];
        const a03 = matrix[3];
        const a10 = matrix[4];
        const a11 = matrix[5];
        const a12 = matrix[6];
        const a13 = matrix[7];
        
        // Performa la rotazione
        matrix[0] = a00 * c + a10 * s;
        matrix[1] = a01 * c + a11 * s;
        matrix[2] = a02 * c + a12 * s;
        matrix[3] = a03 * c + a13 * s;
        matrix[4] = a10 * c - a00 * s;
        matrix[5] = a11 * c - a01 * s;
        matrix[6] = a12 * c - a02 * s;
        matrix[7] = a13 * c - a03 * s;
        
        return matrix;
    }
};

// Utility per random e rumore
const Random = {
    // Genera un numero random in un range
    range: (min, max) => min + Math.random() * (max - min),
    
    // Genera un intero random in un range (inclusi min e max)
    rangeInt: (min, max) => Math.floor(Random.range(min, max + 0.999)),
    
    // Genera un punto random in una sfera
    pointInSphere: (radius = 1) => {
        const theta = 2 * Math.PI * Math.random();
        const phi = Math.acos(2 * Math.random() - 1);
        const r = radius * Math.cbrt(Math.random());
        
        return [
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.sin(phi) * Math.sin(theta),
            r * Math.cos(phi)
        ];
    }
};

// Utility per conversione tra gradi e radianti
const MathUtils = {
    DEG_TO_RAD: Math.PI / 180,
    RAD_TO_DEG: 180 / Math.PI,
    
    toRadians: (degrees) => degrees * Math.PI / 180,
    toDegrees: (radians) => radians * 180 / Math.PI
};

// Rendi disponibili globalmente
window.Vector3 = Vector3;
window.Quaternion = Quaternion;
window.Interpolation = Interpolation;
window.Collision = Collision;
window.MatrixUtils = MatrixUtils;
window.Random = Random;
window.MathUtils = MathUtils;