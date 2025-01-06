// Funzioni matematiche utili

/**
 * Calcola la distanza tra due punti in uno spazio 3D.
 * @param {Vector3} point1 - Primo punto con {x, y, z}.
 * @param {Vector3} point2 - Secondo punto con {x, y, z}.
 * @returns {number} Distanza tra i due punti.
 */
function distance3D(point1, point2) {
    if (!point1 || !point2) {
        throw new Error("Entrambi i punti devono essere definiti");
    }
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
    if (t < 0 || t > 1) {
        throw new Error("t deve essere compreso tra 0 e 1");
    }
    return a + (b - a) * t;
}

/**
 * Normalizza un vettore 3D.
 * @param {Vector3} vec - Vettore da normalizzare.
 * @returns {Vector3} Vettore normalizzato.
 */
function normalize(vec) {
    if (!vec) {
        throw new Error("Il vettore deve essere definito");
    }
    const length = Math.sqrt(vec.x * vec.x + vec.y * vec.y + vec.z * vec.z);
    if (length === 0) return new Vector3();
    return new Vector3(vec.x / length, vec.y / length, vec.z / length);
}

/**
 * Prodotto scalare tra due vettori 3D.
 * @param {Vector3} vec1 - Primo vettore.
 * @param {Vector3} vec2 - Secondo vettore.
 * @returns {number} Prodotto scalare.
 */
function dotProduct(vec1, vec2) {
    if (!vec1 || !vec2) {
        throw new Error("Entrambi i vettori devono essere definiti");
    }
    return vec1.x * vec2.x + vec1.y * vec2.y + vec1.z * vec2.z;
}

/**
 * Prodotto vettoriale tra due vettori 3D.
 * @param {Vector3} vec1 - Primo vettore.
 * @param {Vector3} vec2 - Secondo vettore.
 * @returns {Vector3} Prodotto vettoriale.
 */
function crossProduct(vec1, vec2) {
    if (!vec1 || !vec2) {
        throw new Error("Entrambi i vettori devono essere definiti");
    }
    return new Vector3(
        vec1.y * vec2.z - vec1.z * vec2.y,
        vec1.z * vec2.x - vec1.x * vec2.z,
        vec1.x * vec2.y - vec1.y * vec2.x
    );
}

// Classe Vector3
class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    add(vec) {
        if (!vec) throw new Error("Il vettore da sommare deve essere definito");
        this.x += vec.x;
        this.y += vec.y;
        this.z += vec.z;
        return this;
    }

    subtract(vec) {
        if (!vec) throw new Error("Il vettore da sottrarre deve essere definito");
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
        if (length === 0) return this;
        return this.multiplyScalar(1 / length);
    }

    clone() {
        return new Vector3(this.x, this.y, this.z);
    }

    equals(vec) {
        return this.x === vec.x && this.y === vec.y && this.z === vec.z;
    }

    toArray() {
        return [this.x, this.y, this.z];
    }
}

// Esportazioni
export { distance3D, lerp, normalize, dotProduct, crossProduct, Vector3 };
