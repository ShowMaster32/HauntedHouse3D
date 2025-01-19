// utils.js

/**
 * Utilità per WebGL
 */
export const WebGLUtils = {
    /**
     * Carica una texture da un URL
     * @param {WebGLRenderingContext} gl - Contesto WebGL
     * @param {string} url - URL dell'immagine
     * @returns {WebGLTexture} La texture creata
     */
    loadTexture(gl, url) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);

        // Inserisci un pixel di placeholder mentre l'immagine carica
        const level = 0;
        const internalFormat = gl.RGBA;
        const width = 1;
        const height = 1;
        const border = 0;
        const srcFormat = gl.RGBA;
        const srcType = gl.UNSIGNED_BYTE;
        const pixel = new Uint8Array([255, 255, 255, 255]);
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                    width, height, border, srcFormat, srcType,
                    pixel);

        const image = new Image();
        image.onload = () => {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                        srcFormat, srcType, image);

            // Genera mipmap se l'immagine è potenza di 2
            if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
                gl.generateMipmap(gl.TEXTURE_2D);
            } else {
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            }
        };
        image.src = url;

        return texture;
    },

    /**
     * Compila uno shader
     * @param {WebGLRenderingContext} gl - Contesto WebGL
     * @param {number} type - Tipo di shader
     * @param {string} source - Codice sorgente dello shader
     * @returns {WebGLShader} Lo shader compilato
     */
    compileShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Errore durante la compilazione dello shader:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }
};

/**
 * Utilità matematiche
 */
export const MathUtils = {
    /**
     * Converte gradi in radianti
     * @param {number} degrees - Angolo in gradi
     * @returns {number} Angolo in radianti
     */
    degToRad(degrees) {
        return degrees * Math.PI / 180;
    },

    /**
     * Verifica se un numero è potenza di 2
     * @param {number} value - Valore da controllare
     * @returns {boolean} True se è potenza di 2
     */
    isPowerOf2(value) {
        return (value & (value - 1)) === 0;
    },

    /**
     * Limita un valore in un intervallo
     * @param {number} value - Valore da limitare
     * @param {number} min - Minimo
     * @param {number} max - Massimo
     * @returns {number} Valore limitato
     */
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
};

/**
 * Utilità per il debug
 */
export const DebugUtils = {
    /**
     * Crea un contatore FPS
     * @returns {Object} Oggetto per il conteggio FPS
     */
    createFPSCounter() {
        let lastTime = performance.now();
        let frames = 0;
        let fps = 0;

        return {
            update() {
                const currentTime = performance.now();
                frames++;

                if (currentTime >= lastTime + 1000) {
                    fps = frames;
                    frames = 0;
                    lastTime = currentTime;
                }

                return fps;
            },
            getFPS() {
                return fps;
            }
        };
    },

    /**
     * Logger con livelli e timestamp
     */
    Logger: {
        log(message, ...args) {
            console.log(`[${new Date().toISOString()}] ${message}`, ...args);
        },

        warn(message, ...args) {
            console.warn(`[${new Date().toISOString()}] WARNING: ${message}`, ...args);
        },

        error(message, ...args) {
            console.error(`[${new Date().toISOString()}] ERROR: ${message}`, ...args);
        }
    }
};

/**
 * Utilità per il caricamento di risorse
 */
export const ResourceLoader = {
    /**
     * Carica un file di testo
     * @param {string} url - URL del file
     * @returns {Promise<string>} Contenuto del file
     */
    async loadTextFile(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.text();
        } catch (error) {
            console.error('Errore nel caricamento del file:', error);
            throw error;
        }
    },

    /**
     * Carica un file JSON
     * @param {string} url - URL del file
     * @returns {Promise<Object>} Oggetto JSON
     */
    async loadJSONFile(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Errore nel caricamento del file JSON:', error);
            throw error;
        }
    }
};

/**
 * Utilità per l'interfaccia utente
 */
export const UIUtils = {
    /**
     * Crea un elemento dell'interfaccia
     * @param {string} type - Tipo di elemento HTML
     * @param {Object} attributes - Attributi dell'elemento
     * @param {string} content - Contenuto dell'elemento
     * @returns {HTMLElement} Elemento creato
     */
    createElement(type, attributes = {}, content = '') {
        const element = document.createElement(type);
        
        for (const [key, value] of Object.entries(attributes)) {
            if (key === 'class') {
                element.className = value;
            } else {
                element.setAttribute(key, value);
            }
        }
        
        if (content) {
            element.textContent = content;
        }
        
        return element;
    },

    /**
     * Aggiunge/rimuove una classe con animazione
     * @param {HTMLElement} element - Elemento target
     * @param {string} className - Nome della classe
     * @param {boolean} add - True per aggiungere, false per rimuovere
     */
    toggleClassWithAnimation(element, className, add) {
        if (add) {
            element.classList.add(className);
            element.style.animation = 'fadeIn 0.3s';
        } else {
            element.style.animation = 'fadeOut 0.3s';
            setTimeout(() => {
                element.classList.remove(className);
            }, 300);
        }
    }
};