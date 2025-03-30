// shader-test-improved.js
// Utility migliorata per verificare che gli shader funzionino correttamente

class ShaderTestUtils {
    constructor(renderer) {
        this.renderer = renderer;
        this.gl = renderer.gl;
        this.testResults = {
            shaderCompilation: false,
            uniformLocations: false,
            textureBinding: false,
            lightingSetup: false
        };
        this.shaderProgram = null;
        this.debugLog = true;
        
        // Dati per test più dettagliati
        this.uniformInfo = {};
        this.missingUniforms = [];
        this.lightTestValues = {};
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

    async runTests() {
        this.log('Starting shader and lighting tests...');

        try {
            // Test 1: Verifica compilazione shader e creazione programma
            this.log('Test 1: Verifica compilazione shader');
            await this.testShaderCompilation();

            if (this.shaderProgram) {
                // Test 2: Verifica location uniform
                this.log('Test 2: Verifica uniform locations');
                this.testUniformLocations();

                // Test 3: Verifica binding texture
                this.log('Test 3: Verifica texture binding');
                this.testTextureBinding();

                // Test 4: Verifica setup illuminazione
                this.log('Test 4: Verifica setup illuminazione');
                this.testLightingSetup();
                
                // Test 5: Verifica valori di illuminazione predefiniti
                this.log('Test 5: Verifica valori di illuminazione');
                this.testLightingValues();
            } else {
                this.log('Impossibile procedere con i test: programma shader non creato', true);
            }

            // Stampa risultati finali
            this.printResults();
        } catch (error) {
            this.log('Errore durante i test: ' + error, true);
        }
    }

    async testShaderCompilation() {
        try {
            // Carica e compila gli shader
            const vertexShaderText = await this.loadShaderSource('shaders/vertex-shader.glsl');
            const fragmentShaderText = await this.loadShaderSource('shaders/fragment-shader.glsl');
            
            this.log('Contenuto vertex shader:');
            this.log('------------------------');
            this.log(vertexShaderText.substring(0, 200) + '...');
            
            this.log('Contenuto fragment shader:');
            this.log('--------------------------');
            this.log(fragmentShaderText.substring(0, 200) + '...');
            
            const vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
            this.gl.shaderSource(vertexShader, vertexShaderText);
            this.gl.compileShader(vertexShader);
            
            if (!this.gl.getShaderParameter(vertexShader, this.gl.COMPILE_STATUS)) {
                const error = this.gl.getShaderInfoLog(vertexShader);
                this.log(`Vertex shader compile error: ${error}`, true);
                
                // Tentativo di identificare la linea dell'errore
                this.analyzeShaderError(error, vertexShaderText, 'vertex');
                
                throw new Error(`Vertex shader compile error`);
            }
            this.log('Vertex shader compilato correttamente');
            
            const fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
            this.gl.shaderSource(fragmentShader, fragmentShaderText);
            this.gl.compileShader(fragmentShader);
            
            if (!this.gl.getShaderParameter(fragmentShader, this.gl.COMPILE_STATUS)) {
                const error = this.gl.getShaderInfoLog(fragmentShader);
                this.log(`Fragment shader compile error: ${error}`, true);
                
                // Tentativo di identificare la linea dell'errore
                this.analyzeShaderError(error, fragmentShaderText, 'fragment');
                
                throw new Error(`Fragment shader compile error`);
            }
            this.log('Fragment shader compilato correttamente');

            // Crea il programma
            const program = this.gl.createProgram();
            this.gl.attachShader(program, vertexShader);
            this.gl.attachShader(program, fragmentShader);
            this.gl.linkProgram(program);

            if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
                const error = this.gl.getProgramInfoLog(program);
                this.log(`Linking error: ${error}`, true);
                throw new Error(`Linking error`);
            }

            this.shaderProgram = program;
            this.testResults.shaderCompilation = true;
            this.log('Programma shader creato e linkato correttamente');
            
            // Raccoglie informazioni sugli attributi
            this.logAttributeInfo(program);

        } catch (error) {
            this.log('Errore nella compilazione degli shader: ' + error, true);
            throw error;
        }
    }
    
    // Carica il sorgente di uno shader con gestione errori
    async loadShaderSource(path) {
        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Non è stato possibile caricare ${path}: ${response.statusText}`);
            }
            return await response.text();
        } catch (error) {
            this.log(`Errore nel caricamento dello shader ${path}: ${error}`, true);
            
            // Restituisci uno shader predefinito in caso di errore
            if (path.includes('vertex')) {
                return this.getDefaultVertexShader();
            } else {
                return this.getDefaultFragmentShader();
            }
        }
    }
    
    // Shader vertex predefinito
    getDefaultVertexShader() {
        return `
        attribute vec4 aPosition;
        attribute vec3 aNormal;
        attribute vec2 aTextureCoord;
        
        uniform mat4 uModelMatrix;
        uniform mat4 uViewMatrix;
        uniform mat4 uProjectionMatrix;
        uniform mat4 uNormalMatrix;
        
        varying vec3 vNormal;
        varying vec3 vFragPos;
        varying vec2 vTextureCoord;
        
        void main() {
            vec4 worldPos = uModelMatrix * aPosition;
            vFragPos = worldPos.xyz;
            vNormal = mat3(uNormalMatrix) * aNormal;
            vTextureCoord = aTextureCoord;
            gl_Position = uProjectionMatrix * uViewMatrix * worldPos;
        }
        `;
    }
    
    // Shader fragment predefinito
    getDefaultFragmentShader() {
        return `
        precision highp float;
        
        varying vec3 vNormal;
        varying vec3 vFragPos;
        varying vec2 vTextureCoord;
        
        uniform sampler2D uSampler;
        uniform vec3 uLightPosition;
        uniform vec3 uLightColor;
        uniform float uLightIntensity;
        uniform vec3 uViewPosition;
        
        void main() {
            vec3 norm = normalize(vNormal);
            vec3 lightDir = normalize(uLightPosition - vFragPos);
            
            float diff = max(dot(norm, lightDir), 0.0);
            vec3 diffuse = diff * uLightColor * uLightIntensity;
            
            vec3 ambient = vec3(0.1);
            
            vec4 texColor = texture2D(uSampler, vTextureCoord);
            vec3 result = (ambient + diffuse) * texColor.rgb;
            
            gl_FragColor = vec4(result, texColor.a);
        }
        `;
    }
    
    // Analizza gli errori dello shader per trovare il punto esatto
    analyzeShaderError(errorLog, shaderSource, shaderType) {
        const lines = shaderSource.split('\n');
        
        // Cerca il numero di linea negli errori
        const lineMatch = errorLog.match(/ERROR: \d+:(\d+):/);
        
        if (lineMatch && lineMatch[1]) {
            const lineNum = parseInt(lineMatch[1]);
            
            this.log(`Errore nello shader ${shaderType} alla linea ${lineNum}:`, true);
            
            // Mostra alcune linee prima e dopo l'errore
            const startLine = Math.max(0, lineNum - 3);
            const endLine = Math.min(lines.length, lineNum + 2);
            
            for (let i = startLine; i < endLine; i++) {
                const prefix = i === lineNum - 1 ? '>>> ' : '    ';
                this.log(`${prefix}${i + 1}: ${lines[i]}`);
            }
        }
    }
    
    // Mostra informazioni sugli attributi
    logAttributeInfo(program) {
        const numAttribs = this.gl.getProgramParameter(program, this.gl.ACTIVE_ATTRIBUTES);
        this.log(`Attributi attivi: ${numAttribs}`);
        
        for (let i = 0; i < numAttribs; i++) {
            const info = this.gl.getActiveAttrib(program, i);
            const location = this.gl.getAttribLocation(program, info.name);
            this.log(`  ${info.name}: location=${location}, type=${this.getAttributeTypeName(info.type)}, size=${info.size}`);
        }
    }
    
    // Ottieni il nome del tipo di attributo
    getAttributeTypeName(type) {
        const gl = this.gl;
        switch(type) {
            case gl.FLOAT: return 'FLOAT';
            case gl.FLOAT_VEC2: return 'FLOAT_VEC2';
            case gl.FLOAT_VEC3: return 'FLOAT_VEC3';
            case gl.FLOAT_VEC4: return 'FLOAT_VEC4';
            case gl.FLOAT_MAT2: return 'FLOAT_MAT2';
            case gl.FLOAT_MAT3: return 'FLOAT_MAT3';
            case gl.FLOAT_MAT4: return 'FLOAT_MAT4';
            default: return 'UNKNOWN';
        }
    }

    testUniformLocations() {
        if (!this.shaderProgram) {
            this.log('Programma shader non disponibile', true);
            return;
        }

        const requiredUniforms = [
            'uModelMatrix',
            'uViewMatrix',
            'uProjectionMatrix',
            'uNormalMatrix',
            'uLightPosition',
            'uLightColor',
            'uLightIntensity',
            'uAttenuation',
            'uAmbientColor',
            'uAmbientIntensity',
            'uAmbientStrength',
            'uViewPosition',
            'uSpecularStrength',
            'uShininess',
            'uSampler',
            'uShadowMap',
            'uShadowsEnabled',
            'uReflectionsEnabled',
            'uAdvancedRendering'
        ];

        this.gl.useProgram(this.shaderProgram);
        
        this.missingUniforms = [];
        this.uniformInfo = {};
        
        // Raccoglie informazioni su tutte le uniform
        const numUniforms = this.gl.getProgramParameter(this.shaderProgram, this.gl.ACTIVE_UNIFORMS);
        this.log(`Uniform attive nel programma: ${numUniforms}`);
        
        for (let i = 0; i < numUniforms; i++) {
            const info = this.gl.getActiveUniform(this.shaderProgram, i);
            const location = this.gl.getUniformLocation(this.shaderProgram, info.name);
            
            this.uniformInfo[info.name] = {
                type: this.getUniformTypeName(info.type),
                size: info.size,
                location: location
            };
            
            this.log(`  ${info.name}: type=${this.uniformInfo[info.name].type}, size=${info.size}`);
        }
        
        // Verifica le uniform richieste
        for (const uniform of requiredUniforms) {
            const location = this.gl.getUniformLocation(this.shaderProgram, uniform);
            if (location === null) {
                this.missingUniforms.push(uniform);
            }
        }

        if (this.missingUniforms.length === 0) {
            this.log('Tutte le uniform sono presenti e accessibili');
            this.testResults.uniformLocations = true;
        } else {
            this.log('Uniform mancanti: ' + this.missingUniforms.join(', '), true);
        }
    }
    
    // Ottieni il nome del tipo di uniform
    getUniformTypeName(type) {
        const gl = this.gl;
        switch(type) {
            case gl.FLOAT: return 'FLOAT';
            case gl.FLOAT_VEC2: return 'FLOAT_VEC2';
            case gl.FLOAT_VEC3: return 'FLOAT_VEC3';
            case gl.FLOAT_VEC4: return 'FLOAT_VEC4';
            case gl.INT: return 'INT';
            case gl.INT_VEC2: return 'INT_VEC2';
            case gl.INT_VEC3: return 'INT_VEC3';
            case gl.INT_VEC4: return 'INT_VEC4';
            case gl.BOOL: return 'BOOL';
            case gl.BOOL_VEC2: return 'BOOL_VEC2';
            case gl.BOOL_VEC3: return 'BOOL_VEC3';
            case gl.BOOL_VEC4: return 'BOOL_VEC4';
            case gl.FLOAT_MAT2: return 'FLOAT_MAT2';
            case gl.FLOAT_MAT3: return 'FLOAT_MAT3';
            case gl.FLOAT_MAT4: return 'FLOAT_MAT4';
            case gl.SAMPLER_2D: return 'SAMPLER_2D';
            case gl.SAMPLER_CUBE: return 'SAMPLER_CUBE';
            default: return 'UNKNOWN';
        }
    }

    testTextureBinding() {
        try {
            this.gl.useProgram(this.shaderProgram);
            
            const texture = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
            
            this.gl.texImage2D(
                this.gl.TEXTURE_2D, 
                0, 
                this.gl.RGBA, 
                1, 1, 
                0, 
                this.gl.RGBA, 
                this.gl.UNSIGNED_BYTE, 
                new Uint8Array([255, 0, 0, 255])
            );
            
            // Imposta i parametri di texture
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
            
            // Verifica la texture uniform
            const samplerLoc = this.gl.getUniformLocation(this.shaderProgram, 'uSampler');
            
            if (samplerLoc) {
                this.gl.uniform1i(samplerLoc, 0); // Texture unit 0
                
                // Attiva texture unit 0
                this.gl.activeTexture(this.gl.TEXTURE0);
                this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
            } else {
                this.log('Uniform uSampler non trovata', true);
            }

            if (this.gl.getError() === this.gl.NO_ERROR) {
                this.log('Texture binding funzionante');
                this.testResults.textureBinding = true;
            } else {
                this.log('Errore nel binding delle texture: ' + this.getGlErrorString(this.gl.getError()), true);
            }
        } catch (error) {
            this.log('Errore nel test delle texture: ' + error, true);
        }
    }
    
    // Ottieni stringa di errore GL
    getGlErrorString(error) {
        const gl = this.gl;
        switch(error) {
            case gl.NO_ERROR: return 'NO_ERROR';
            case gl.INVALID_ENUM: return 'INVALID_ENUM';
            case gl.INVALID_VALUE: return 'INVALID_VALUE';
            case gl.INVALID_OPERATION: return 'INVALID_OPERATION';
            case gl.INVALID_FRAMEBUFFER_OPERATION: return 'INVALID_FRAMEBUFFER_OPERATION';
            case gl.OUT_OF_MEMORY: return 'OUT_OF_MEMORY';
            case gl.CONTEXT_LOST_WEBGL: return 'CONTEXT_LOST_WEBGL';
            default: return 'UNKNOWN_ERROR';
        }
    }

    testLightingSetup() {
        try {
            if (!this.shaderProgram) {
                throw new Error('Programma shader non disponibile');
            }

            this.gl.useProgram(this.shaderProgram);
            
            const testLight = {
                position: [0, 8, 0],
                color: [1, 0.95, 0.8],
                intensity: 150.0,
                attenuation: [1.0, 0.014, 0.0007]
            };
            
            const testAmbient = {
                color: [0.3, 0.3, 0.35],
                intensity: 0.5,
                strength: 0.5
            };
            
            // Salva i valori per test futuri
            this.lightTestValues = {
                light: testLight,
                ambient: testAmbient
            };

            // Test dei valori di luce
            const lightPosLoc = this.gl.getUniformLocation(this.shaderProgram, 'uLightPosition');
            const lightColorLoc = this.gl.getUniformLocation(this.shaderProgram, 'uLightColor');
            const lightIntensityLoc = this.gl.getUniformLocation(this.shaderProgram, 'uLightIntensity');
            
            // Test dei valori di luce ambientale
            const ambientColorLoc = this.gl.getUniformLocation(this.shaderProgram, 'uAmbientColor');
            const ambientIntensityLoc = this.gl.getUniformLocation(this.shaderProgram, 'uAmbientIntensity');
            const ambientStrengthLoc = this.gl.getUniformLocation(this.shaderProgram, 'uAmbientStrength');
            
            // Test dell'attenuazione
            const attenuationLoc = this.gl.getUniformLocation(this.shaderProgram, 'uAttenuation');
            
            // Verifica le location
            if (lightPosLoc === null || lightColorLoc === null || lightIntensityLoc === null) {
                this.log('Location delle uniform della luce principale non trovate', true);
                throw new Error('Location delle uniform della luce principale non trovate');
            }
            
            if (ambientColorLoc === null || ambientIntensityLoc === null || ambientStrengthLoc === null) {
                this.log('Location delle uniform della luce ambientale non trovate', true);
            }
            
            if (attenuationLoc === null) {
                this.log('Location della uniform di attenuazione non trovata', true);
            }

            // Imposta i valori della luce principale
            this.gl.uniform3fv(lightPosLoc, new Float32Array(testLight.position));
            this.gl.uniform3fv(lightColorLoc, new Float32Array(testLight.color));
            this.gl.uniform1f(lightIntensityLoc, testLight.intensity);
            
            // Imposta i valori della luce ambientale se esistono
            if (ambientColorLoc !== null && ambientIntensityLoc !== null && ambientStrengthLoc !== null) {
                this.gl.uniform3fv(ambientColorLoc, new Float32Array(testAmbient.color));
                this.gl.uniform1f(ambientIntensityLoc, testAmbient.intensity);
                this.gl.uniform1f(ambientStrengthLoc, testAmbient.strength);
            }
            
            // Imposta l'attenuazione se esiste
            if (attenuationLoc !== null) {
                this.gl.uniform3fv(attenuationLoc, new Float32Array(testLight.attenuation));
            }

            if (this.gl.getError() === this.gl.NO_ERROR) {
                this.log('Setup illuminazione funzionante');
                this.testResults.lightingSetup = true;
            } else {
                this.log('Errore nel setup dell\'illuminazione: ' + this.getGlErrorString(this.gl.getError()), true);
            }
        } catch (error) {
            this.log('Errore nel test dell\'illuminazione: ' + error, true);
        }
    }
    
    // Test dei valori di illuminazione per verificare che siano corretti
    testLightingValues() {
        if (!this.shaderProgram || !this.testResults.lightingSetup) {
            this.log('Test illuminazione non eseguito o fallito', true);
            return;
        }
        
        this.log('\nDettagli dei valori di illuminazione:');
        
        // Mostra i valori della luce
        const light = this.lightTestValues.light;
        const ambient = this.lightTestValues.ambient;
        
        this.log(`Luce principale:`);
        this.log(`  Posizione: [${light.position.join(', ')}]`);
        this.log(`  Colore: [${light.color.join(', ')}]`);
        this.log(`  Intensità: ${light.intensity}`);
        this.log(`  Attenuazione: [${light.attenuation.join(', ')}]`);
        
        this.log(`Luce ambientale:`);
        this.log(`  Colore: [${ambient.color.join(', ')}]`);
        this.log(`  Intensità: ${ambient.intensity}`);
        this.log(`  Forza: ${ambient.strength}`);
        
        // Fornisci suggerimenti per valori migliori se necessario
        if (light.intensity < 100) {
            this.log('Suggerimento: L\'intensità della luce principale potrebbe essere troppo bassa per una buona visibilità', 'warning');
        }
        
        if (ambient.intensity < 0.3) {
            this.log('Suggerimento: L\'intensità della luce ambientale potrebbe essere troppo bassa, causando aree molto scure', 'warning');
        }
    }

    printResults() {
        this.log('\nRisultati dei test:');
        this.log('--------------------');
        Object.entries(this.testResults).forEach(([test, passed]) => {
            this.log(`${passed ? '✓' : '❌'} ${test}: ${passed ? 'OK' : 'FALLITO'}`);
        });

        const allPassed = Object.values(this.testResults).every(result => result);
        this.log('\nStato generale: ' + (allPassed ? '✓ Tutti i test passati' : '❌ Alcuni test falliti'));
        
        // Mostra suggerimenti di debug se ci sono problemi
        if (!allPassed) {
            this.showDebugSuggestions();
        }
    }
    
    // Mostra suggerimenti di debug in base ai test falliti
    showDebugSuggestions() {
        this.log('\nSuggerimenti per la risoluzione dei problemi:');
        
        if (!this.testResults.shaderCompilation) {
            this.log('1. Verifica la sintassi degli shader, controlla gli errori segnalati sopra');
            this.log('2. Assicurati che le versioni degli shader siano compatibili con il tuo browser/GPU');
            this.log('3. Prova a semplificare gli shader rimuovendo le funzionalità avanzate');
        }
        
        if (!this.testResults.uniformLocations) {
            this.log('1. Le seguenti uniform sono mancanti: ' + this.missingUniforms.join(', '));
            this.log('2. Assicurati che le uniform siano dichiarate e utilizzate negli shader');
            this.log('3. Correggi eventuali errori di ortografia nei nomi delle uniform');
        }
        
        if (!this.testResults.textureBinding) {
            this.log('1. Verifica che la uniform uSampler sia correttamente dichiarata e utilizzata');
            this.log('2. Controlla che le texture siano correttamente caricate nel renderer');
        }
        
        if (!this.testResults.lightingSetup) {
            this.log('1. Verifica che tutte le uniform di illuminazione siano dichiarate nel fragment shader');
            this.log('2. Controlla che i tipi delle uniform corrispondano (vec3, float, etc.)');
            this.log('3. Assicurati che il calcolo dell\'illuminazione sia implementato correttamente');
        }
    }
}

// Export per uso globale
window.ShaderTestUtils = ShaderTestUtils;