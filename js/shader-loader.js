// shader-loader.js
// Gestisce il caricamento e la compilazione degli shader

class ShaderLoader {
    constructor(gl) {
        this.gl = gl;
        this.debugLog = true;
    }

    // Funzione per aggiungere log
    log(message, isError = false) {
        if (this.debugLog) {
            console.log(isError ? `[ERROR] ${message}` : `[INFO] ${message}`);
            
            if (typeof logDebug === 'function') {
                logDebug(message, isError ? 'error' : 'info');
            }
        }
    }

    async loadShaders() {
        try {
            this.log('Iniziando caricamento shader...');
            
            // Carica gli shader da file
            const vertexShader = await this.loadShaderFile('shaders/vertex-shader.glsl');
            const fragmentShader = await this.loadShaderFile('shaders/fragment-shader.glsl');
            const shadowVertexShader = await this.loadShaderFile('shaders/shadow-vertex-shader.glsl');
            const shadowFragmentShader = await this.loadShaderFile('shaders/shadow-fragment-shader.glsl');

            // Crea i programmi shader
            const mainProgram = this.createProgram(vertexShader, fragmentShader);
            const shadowProgram = this.createProgram(shadowVertexShader, shadowFragmentShader);

            this.log('Shader caricati e programmi creati con successo');
            
            return {
                mainProgram,
                shadowProgram
            };
        } catch (error) {
            this.log('Errore nel caricamento degli shader: ' + error, true);
            throw error;
        }
    }

    async loadShaderFile(filename) {
        try {
            const response = await fetch(filename);
            if (!response.ok) {
                throw new Error(`Impossibile caricare ${filename}`);
            }
            this.log(`Shader ${filename} caricato correttamente`);
            return await response.text();
        } catch (error) {
            this.log(`Errore nel caricamento del file shader ${filename}: ${error}`, true);
            throw error;
        }
    }

    createShader(type, source) {
        const typeStr = type === this.gl.VERTEX_SHADER ? 'vertex' : 'fragment';
        this.log(`Compilando shader ${typeStr}...`);
        
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            const error = new Error(`Errore nella compilazione dello shader ${typeStr}: ${this.gl.getShaderInfoLog(shader)}`);
            this.gl.deleteShader(shader);
            this.log(error.message, true);
            throw error;
        }

        this.log(`Shader ${typeStr} compilato con successo`);
        return shader;
    }

    createProgram(vertexSource, fragmentSource) {
        this.log('Creando programma shader...');
        
        // Compila gli shader
        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentSource);

        // Crea e collega gli shader al programma
        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);

        // Verifica il successo del linking
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            const error = new Error(`Errore nel linking del programma: ${this.gl.getProgramInfoLog(program)}`);
            this.gl.deleteProgram(program);
            this.log(error.message, true);
            throw error;
        }

        // Dopo il successo del linking, possiamo eliminare gli shader individuali
        this.gl.deleteShader(vertexShader);
        this.gl.deleteShader(fragmentShader);

        this.log('Programma shader creato con successo');
        return program;
    }

    // Verifica che tutte le uniform necessarie siano accessibili
    validateProgramUniforms(program, requiredUniforms) {
        this.gl.useProgram(program);
        
        const missingUniforms = [];
        for (const uniform of requiredUniforms) {
            const location = this.gl.getUniformLocation(program, uniform);
            if (location === null) {
                missingUniforms.push(uniform);
            }
        }

        if (missingUniforms.length > 0) {
            this.log(`Uniform mancanti: ${missingUniforms.join(', ')}`, true);
            return false;
        }
        
        return true;
    }
}

// Esporta per uso globale
window.ShaderLoader = ShaderLoader;