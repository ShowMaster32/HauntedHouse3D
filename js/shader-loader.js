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

    // Carica gli shader necessari per il gioco
    async loadShaders() {
        try {
            this.log('Iniziando caricamento shader...');
            
            // Prepara il contenuto degli shader
            const vertexShaderText = await this.loadShaderSource('shaders/vertex-shader.glsl');
            const fragmentShaderText = await this.loadShaderSource('shaders/fragment-shader.glsl');
            const shadowVertexShaderText = await this.loadShaderSource('shaders/shadow-vertex-shader.glsl');
            const shadowFragmentShaderText = await this.loadShaderSource('shaders/shadow-fragment-shader.glsl');

            // Crea i programmi shader
            const mainProgram = this.createProgram(vertexShaderText, fragmentShaderText);
            const shadowProgram = this.createProgram(shadowVertexShaderText, shadowFragmentShaderText);

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

    // Carica il sorgente di uno shader
    async loadShaderSource(path) {
        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Impossibile caricare ${path}: ${response.statusText}`);
            }
            
            let source = await response.text();
            
            // Controlla se WebGL2 è supportato completamente
            const isWebGL2Fully = this.gl instanceof WebGL2RenderingContext &&
                                 this.gl.getParameter(this.gl.SHADING_LANGUAGE_VERSION).indexOf("3.00") !== -1;
            
            if (!isWebGL2Fully) {
                // Converti da WebGL 2.0 a WebGL 1.0
                source = source.replace('#version 300 es', '');
                source = source.replace(/in\s+/g, 'attribute ');
                source = source.replace(/out\s+/g, 'varying ');
                source = source.replace(/texture\s*\(/g, 'texture2D(');
                
                if (path.includes('fragment')) {
                    source = source.replace(/out\s+vec4\s+\w+;/g, '');
                    source = source.replace(/\bfragColor\b/g, 'gl_FragColor');
                }
            }
            
            return source;
        } catch (error) {
            // Usa fallback se necessario
            return this.getFallbackShader(path);
        }
    }

    // Aggiungi codice di fallback per WebGL 1 se necessario
    addFallbackCode(source, path) {
        // Se lo shader è un vertex shader, nessuna modifica è necessaria
        if (path.includes('vertex')) {
            return source;
        }
        
        // Se lo shader è un fragment shader, aggiungi la definizione per standardizzare
        const webgl1Source = source
            .replace('#version 300 es', '') // Rimuovi la dichiarazione 300 es
            .replace(/in\s+/g, 'varying ') // Sostituisci "in" con "varying"
            .replace(/out\s+vec4\s+fragColor;/, '') // Rimuovi out fragColor
            .replace(/texture\(/g, 'texture2D(') // Sostituisci texture() con texture2D()
            .replace(/fragColor\s*=/g, 'gl_FragColor ='); // Sostituisci fragColor con gl_FragColor
        
        return `
        #ifdef GL_ES
        precision highp float;
        #endif
        
        ${webgl1Source}
        `;
    }

    // Fornisce shader di fallback in caso di errore
    getFallbackShader(path) {
        if (path.includes('vertex')) {
            return `
            attribute vec4 aPosition;
            attribute vec2 aTextureCoord;
            attribute vec3 aNormal;
            
            uniform mat4 uModelMatrix;
            uniform mat4 uViewMatrix;
            uniform mat4 uProjectionMatrix;
            
            varying vec2 vTextureCoord;
            varying vec3 vNormal;
            varying vec3 vFragPos;
            
            void main() {
                vec4 worldPosition = uModelMatrix * aPosition;
                vFragPos = worldPosition.xyz;
                vNormal = aNormal;
                vTextureCoord = aTextureCoord;
                gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;
            }`;
        } else if (path.includes('shadow-vertex')) {
            return `
            attribute vec4 aPosition;
            uniform mat4 uLightSpaceMatrix;
            uniform mat4 uModelMatrix;
            
            void main() {
                gl_Position = uLightSpaceMatrix * uModelMatrix * aPosition;
            }`;
        } else if (path.includes('shadow-fragment')) {
            return `
            precision highp float;
            
            void main() {
                gl_FragColor = vec4(gl_FragCoord.z, 0.0, 0.0, 1.0);
            }`;
        } else {
            // Fragment shader di base
            return `
            precision highp float;
            
            varying vec2 vTextureCoord;
            varying vec3 vNormal;
            varying vec3 vFragPos;
            
            uniform sampler2D uSampler;
            uniform vec3 uLightPosition;
            uniform vec3 uLightColor;
            uniform float uLightIntensity;
            
            void main() {
                vec4 texColor = texture2D(uSampler, vTextureCoord);
                vec3 normal = normalize(vNormal);
                vec3 lightDir = normalize(uLightPosition - vFragPos);
                float diff = max(dot(normal, lightDir), 0.0);
                vec3 diffuse = uLightColor * diff * texColor.rgb * uLightIntensity;
                vec3 ambient = vec3(0.3) * texColor.rgb;
                vec3 result = ambient + diffuse;
                gl_FragColor = vec4(result, texColor.a);
            }`;
        }
    }

    // Compila uno shader
    compileShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        
        // Verifica stato compilazione
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            const error = new Error(`Errore compilazione shader: ${this.gl.getShaderInfoLog(shader)}`);
            this.gl.deleteShader(shader);
            this.log(error.message, true);
            throw error;
        }
        
        return shader;
    }

    // Crea un programma shader
    createProgram(vertexSource, fragmentSource) {
        // Compila gli shader
        const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentSource);

        // Crea il programma e collega gli shader
        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);

        // Verifica stato linking
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            const error = new Error(`Errore linking programma: ${this.gl.getProgramInfoLog(program)}`);
            this.gl.deleteProgram(program);
            this.log(error.message, true);
            throw error;
        }

        // Cleanup degli shader
        this.gl.detachShader(program, vertexShader);
        this.gl.detachShader(program, fragmentShader);
        this.gl.deleteShader(vertexShader);
        this.gl.deleteShader(fragmentShader);

        return program;
    }

    // Verifica le uniforms richieste
    validateUniforms(program, requiredUniforms) {
        this.gl.useProgram(program);
        
        const missingUniforms = [];
        for (const uniform of requiredUniforms) {
            if (this.gl.getUniformLocation(program, uniform) === null) {
                missingUniforms.push(uniform);
            }
        }
        
        if (missingUniforms.length > 0) {
            this.log(`Uniformi mancanti: ${missingUniforms.join(', ')}`, true);
            return false;
        }
        
        return true;
    }
}

// Esporta globalmente
window.ShaderLoader = ShaderLoader;