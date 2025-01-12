// Funzioni matematiche utili con log per il debug

/**
 * Calcola la distanza tra due punti in uno spazio 3D.
 * @param {Vector3} point1 - Primo punto con {x, y, z}.
 * @param {Vector3} point2 - Secondo punto con {x, y, z}.
 * @returns {number} Distanza tra i due punti.
 */
function distance3D(point1, point2) {
    if (!point1 || !point2) {
        console.error("[distance3D] Entrambi i punti devono essere definiti.");
        throw new Error("Entrambi i punti devono essere definiti");
    }
    const distance = Math.sqrt(
        Math.pow(point2.x - point1.x, 2) +
        Math.pow(point2.y - point1.y, 2) +
        Math.pow(point2.z - point1.z, 2)
    );
    console.log(`[distance3D] Distanza calcolata: ${distance}`);
    return distance;
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
        console.error("[lerp] t deve essere compreso tra 0 e 1.");
        throw new Error("t deve essere compreso tra 0 e 1");
    }
    const result = a + (b - a) * t;
    console.log(`[lerp] Valore interpolato: ${result}`);
    return result;
}

/**
 * Normalizza un vettore 3D.
 * @param {Vector3} vec - Vettore da normalizzare.
 * @returns {Vector3} Vettore normalizzato.
 */
function normalize(vec) {
    if (!vec) {
        console.error("[normalize] Il vettore deve essere definito.");
        throw new Error("Il vettore deve essere definito");
    }
    const length = Math.sqrt(vec.x * vec.x + vec.y * vec.y + vec.z * vec.z);
    if (length === 0) {
        console.warn("[normalize] Lunghezza del vettore zero, restituisco un vettore nullo.");
        return new Vector3();
    }
    const normalized = new Vector3(vec.x / length, vec.y / length, vec.z / length);
    console.log(`[normalize] Vettore normalizzato: ${JSON.stringify(normalized)}`);
    return normalized;
}

/**
 * Prodotto scalare tra due vettori 3D.
 * @param {Vector3} vec1 - Primo vettore.
 * @param {Vector3} vec2 - Secondo vettore.
 * @returns {number} Prodotto scalare.
 */
function dotProduct(vec1, vec2) {
    if (!vec1 || !vec2) {
        console.error("[dotProduct] Entrambi i vettori devono essere definiti.");
        throw new Error("Entrambi i vettori devono essere definiti");
    }
    const result = vec1.x * vec2.x + vec1.y * vec2.y + vec1.z * vec2.z;
    console.log(`[dotProduct] Prodotto scalare: ${result}`);
    return result;
}

/**
 * Prodotto vettoriale tra due vettori 3D.
 * @param {Vector3} vec1 - Primo vettore.
 * @param {Vector3} vec2 - Secondo vettore.
 * @returns {Vector3} Prodotto vettoriale.
 */
function crossProduct(vec1, vec2) {
    if (!vec1 || !vec2) {
        console.error("[crossProduct] Entrambi i vettori devono essere definiti.");
        throw new Error("Entrambi i vettori devono essere definiti");
    }
    const result = new Vector3(
        vec1.y * vec2.z - vec1.z * vec2.y,
        vec1.z * vec2.x - vec1.x * vec2.z,
        vec1.x * vec2.y - vec1.y * vec2.x
    );
    console.log(`[crossProduct] Prodotto vettoriale: ${JSON.stringify(result)}`);
    return result;
}

// Classe Vector3
class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
        console.log(`[Vector3] Creato nuovo vettore: ${JSON.stringify(this)}`);
    }

    add(vec) {
        if (!vec) {
            console.error("[Vector3.add] Il vettore da sommare deve essere definito.");
            throw new Error("Il vettore da sommare deve essere definito");
        }
        this.x += vec.x;
        this.y += vec.y;
        this.z += vec.z;
        console.log(`[Vector3.add] Risultato somma: ${JSON.stringify(this)}`);
        return this;
    }

    subtract(vec) {
        if (!vec) {
            console.error("[Vector3.subtract] Il vettore da sottrarre deve essere definito.");
            throw new Error("Il vettore da sottrarre deve essere definito");
        }
        this.x -= vec.x;
        this.y -= vec.y;
        this.z -= vec.z;
        console.log(`[Vector3.subtract] Risultato sottrazione: ${JSON.stringify(this)}`);
        return this;
    }

    multiplyScalar(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        this.z *= scalar;
        console.log(`[Vector3.multiplyScalar] Risultato moltiplicazione scalare: ${JSON.stringify(this)}`);
        return this;
    }

    length() {
        const length = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
        console.log(`[Vector3.length] Lunghezza del vettore: ${length}`);
        return length;
    }

    normalize() {
        const length = this.length();
        if (length === 0) {
            console.warn("[Vector3.normalize] Lunghezza del vettore zero, restituisco il vettore invariato.");
            return this;
        }
        this.multiplyScalar(1 / length);
        console.log(`[Vector3.normalize] Vettore normalizzato: ${JSON.stringify(this)}`);
        return this;
    }

    clone() {
        const clone = new Vector3(this.x, this.y, this.z);
        console.log(`[Vector3.clone] Clonato vettore: ${JSON.stringify(clone)}`);
        return clone;
    }

    equals(vec) {
        const isEqual = this.x === vec.x && this.y === vec.y && this.z === vec.z;
        console.log(`[Vector3.equals] Confronto vettori. Uguali: ${isEqual}`);
        return isEqual;
    }

    toArray() {
        const array = [this.x, this.y, this.z];
        console.log(`[Vector3.toArray] Convertito vettore in array: ${JSON.stringify(array)}`);
        return array;
    }
}

// Esportazioni
export { distance3D, lerp, normalize, dotProduct, crossProduct, Vector3 };
