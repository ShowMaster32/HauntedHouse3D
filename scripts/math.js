// Funzioni matematiche utili

/**
 * Calcola la distanza tra due punti in uno spazio 3D.
 * @param {Object} point1 - Primo punto con {x, y, z}.
 * @param {Object} point2 - Secondo punto con {x, y, z}.
 * @returns {number} Distanza tra i due punti.
 */
function distance3D(point1, point2) {
    return Math.sqrt(
        Math.pow(point2.x - point1.x, 2) +
        Math.pow(point2.y - point1.y, 2) +
        Math.pow(point2.z - point1.z, 2)
    );
}

/**
 * Interpolazione lineare tra due valori.
 * @param {number} a - Valore iniziale.
 * @param {number} b - Valore finale.
 * @param {number} t - Fattore di interpolazione (0 <= t <= 1).
 * @returns {number} Valore interpolato.
 */
function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * Normalizza un vettore 3D.
 * @param {Object} vec - Vettore con {x, y, z}.
 * @returns {Object} Vettore normalizzato.
 */
function normalize(vec) {
    const length = Math.sqrt(vec.x * vec.x + vec.y * vec.y + vec.z * vec.z);
    return {
        x: vec.x / length,
        y: vec.y / length,
        z: vec.z / length,
    };
}

/**
 * Prodotto scalare tra due vettori 3D.
 * @param {Object} vec1 - Primo vettore {x, y, z}.
 * @param {Object} vec2 - Secondo vettore {x, y, z}.
 * @returns {number} Prodotto scalare.
 */
function dotProduct(vec1, vec2) {
    return vec1.x * vec2.x + vec1.y * vec2.y + vec1.z * vec2.z;
}

/**
 * Prodotto vettoriale tra due vettori 3D.
 * @param {Object} vec1 - Primo vettore {x, y, z}.
 * @param {Object} vec2 - Secondo vettore {x, y, z}.
 * @returns {Object} Prodotto vettoriale {x, y, z}.
 */
function crossProduct(vec1, vec2) {
    return {
        x: vec1.y * vec2.z - vec1.z * vec2.y,
        y: vec1.z * vec2.x - vec1.x * vec2.z,
        z: vec1.x * vec2.y - vec1.y * vec2.x,
    };
}

// Classe Vector3

class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    add(vec) {
        this.x += vec.x;
        this.y += vec.y;
        this.z += vec.z;
        return this;
    }

    subtract(vec) {
        this.x -= vec.x;
        this.y -= vec.y;
        this.z -= vec.z;
        return this;
    }

    multiplyScalar(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        this.z *= scalar;
        return this;
    }

    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    normalize() {
        const length = this.length();
        if (length > 0) {
            this.x /= length;
            this.y /= length;
            this.z /= length;
        }
        return this;
    }
}

// Esportazioni
export { distance3D, lerp, normalize, dotProduct, crossProduct, Vector3 };
