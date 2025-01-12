export const Utils = {
    /**
     * Carica una texture da un URL.
     * @param {WebGLRenderingContext} gl - Il contesto WebGL.
     * @param {string} url - L'URL della texture.
     * @returns {WebGLTexture} La texture caricata.
     */
    loadTexture(gl, url) {
        console.log(`[loadTexture] Caricamento texture da URL: ${url}`);
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);

        // Placeholder iniziale per evitare errori di rendering.
        const placeholder = new Uint8Array([255, 255, 255, 255]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, placeholder);

        const image = new Image();
        image.onload = () => {
            console.log(`[loadTexture] Texture caricata correttamente: ${url}`);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            gl.generateMipmap(gl.TEXTURE_2D);
        };
        image.onerror = () => console.error(`[loadTexture] Errore nel caricamento della texture: ${url}`);
        image.src = url;

        return texture;
    },

    /**
     * Compila uno shader.
     * @param {WebGLRenderingContext} gl - Il contesto WebGL.
     * @param {string} source - Il codice sorgente dello shader.
     * @param {number} type - Il tipo di shader (VERTEX_SHADER o FRAGMENT_SHADER).
     * @returns {WebGLShader|null} Lo shader compilato o null in caso di errore.
     */
    compileShader(gl, source, type) {
        console.log(`[compileShader] Compilazione dello shader: ${type === gl.VERTEX_SHADER ? 'VERTEX' : 'FRAGMENT'}`);
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error(`[compileShader] Errore di compilazione (${type === gl.VERTEX_SHADER ? 'VERTEX' : 'FRAGMENT'}):`, gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        console.log(`[compileShader] Shader compilato con successo.`);
        return shader;
    },

    /**
     * Crea e collega un programma shader.
     * @param {WebGLRenderingContext} gl - Il contesto WebGL.
     * @param {string} vertexSource - Il codice sorgente del vertex shader.
     * @param {string} fragmentSource - Il codice sorgente del fragment shader.
     * @returns {WebGLProgram|null} Il programma shader collegato o null in caso di errore.
     */
    createShaderProgram(gl, vertexSource, fragmentSource) {
        console.log(`[createShaderProgram] Creazione del programma shader.`);
        const vertexShader = this.compileShader(gl, vertexSource, gl.VERTEX_SHADER);
        const fragmentShader = this.compileShader(gl, fragmentSource, gl.FRAGMENT_SHADER);

        if (!vertexShader || !fragmentShader) {
            console.error(`[createShaderProgram] Errore nella creazione degli shader.`);
            return null;
        }

        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error(`[createShaderProgram] Errore di collegamento del programma shader:`, gl.getProgramInfoLog(program));
            gl.deleteProgram(program);
            return null;
        }
        console.log(`[createShaderProgram] Programma shader creato e collegato correttamente.`);
        return program;
    },

    /**
     * Crea un buffer WebGL.
     * @param {WebGLRenderingContext} gl - Il contesto WebGL.
     * @param {number} target - Il target del buffer (ARRAY_BUFFER o ELEMENT_ARRAY_BUFFER).
     * @param {TypedArray} data - I dati da memorizzare nel buffer.
     * @returns {WebGLBuffer|null} Il buffer creato o null in caso di errore.
     */
    createBuffer(gl, target, data) {
        console.log(`[createBuffer] Creazione del buffer per il target: ${target}`);
        if (!(data instanceof TypedArray)) {
            console.error(`[createBuffer] Dati non validi per il buffer:`, data);
            return null;
        }
        const buffer = gl.createBuffer();
        gl.bindBuffer(target, buffer);
        gl.bufferData(target, data, gl.STATIC_DRAW);
        console.log(`[createBuffer] Buffer creato con successo.`);
        return buffer;
    },

    /**
     * Calcola la distanza tra due punti 3D.
     * @param {Array<number>} point1 - Il primo punto [x, y, z].
     * @param {Array<number>} point2 - Il secondo punto [x, y, z].
     * @returns {number} La distanza tra i due punti.
     */
    calculateDistance(point1, point2) {
        const dx = point2[0] - point1[0];
        const dy = point2[1] - point1[1];
        const dz = point2[2] - point1[2];
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        console.log(`[calculateDistance] Distanza calcolata: ${distance}`);
        return distance;
    },

    /**
     * Normalizza un vettore 3D.
     * @param {Array<number>} vector - Il vettore da normalizzare [x, y, z].
     * @returns {Array<number>} Il vettore normalizzato.
     */
    normalizeVector(vector) {
        const length = Math.sqrt(vector[0] ** 2 + vector[1] ** 2 + vector[2] ** 2);
        if (length === 0) {
            console.warn(`[normalizeVector] Lunghezza zero, restituisco [0, 0, 0].`);
            return [0, 0, 0];
        }
        const normalized = [vector[0] / length, vector[1] / length, vector[2] / length];
        console.log(`[normalizeVector] Vettore normalizzato: ${JSON.stringify(normalized)}`);
        return normalized;
    },

    /**
     * Genera un colore casuale in formato [r, g, b].
     * @returns {Array<number>} Un colore casuale [r, g, b].
     */
    generateRandomColor() {
        const color = [Math.random(), Math.random(), Math.random()];
        console.log(`[generateRandomColor] Colore generato: ${JSON.stringify(color)}`);
        return color;
    },

    /**
     * Effettua il mapping di un valore da un intervallo a un altro.
     * @param {number} value - Il valore da mappare.
     * @param {number} inMin - Il minimo dell'intervallo di input.
     * @param {number} inMax - Il massimo dell'intervallo di input.
     * @param {number} outMin - Il minimo dell'intervallo di output.
     * @param {number} outMax - Il massimo dell'intervallo di output.
     * @returns {number} Il valore mappato.
     */
    mapValue(value, inMin, inMax, outMin, outMax) {
        const mapped = ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
        console.log(`[mapValue] Valore mappato: ${mapped}`);
        return mapped;
    }
};
