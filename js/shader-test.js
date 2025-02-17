// shader-test.js
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
        this.shaderProgram = null; // Salviamo il riferimento al programma
    }

    async runTests() {
        console.log('Starting shader and lighting tests...');

        try {
            // Test 1: Verifica compilazione shader e creazione programma
            console.log('Test 1: Verifica compilazione shader');
            await this.testShaderCompilation();

            if (this.shaderProgram) {
                // Test 2: Verifica location uniform
                console.log('Test 2: Verifica uniform locations');
                this.testUniformLocations();

                // Test 3: Verifica binding texture
                console.log('Test 3: Verifica texture binding');
                this.testTextureBinding();

                // Test 4: Verifica setup illuminazione
                console.log('Test 4: Verifica setup illuminazione');
                this.testLightingSetup();
            } else {
                console.error('❌ Impossibile procedere con i test: programma shader non creato');
            }

            // Stampa risultati finali
            this.printResults();
        } catch (error) {
            console.error('❌ Errore durante i test:', error);
        }
    }

    async testShaderCompilation() {
        try {
            // Carica e compila gli shader
            const vertexShaderText = await fetch('shaders/vertex-shader.glsl').then(r => r.text());
            const fragmentShaderText = await fetch('shaders/fragment-shader.glsl').then(r => r.text());
            
            const vertexShader = this.renderer.createShader(this.gl.VERTEX_SHADER, vertexShaderText);
            console.log('✓ Vertex shader compilato correttamente');
            
            const fragmentShader = this.renderer.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderText);
            console.log('✓ Fragment shader compilato correttamente');

            // Crea il programma
            const program = this.gl.createProgram();
            this.gl.attachShader(program, vertexShader);
            this.gl.attachShader(program, fragmentShader);
            this.gl.linkProgram(program);

            if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
                throw new Error(`Linking error: ${this.gl.getProgramInfoLog(program)}`);
            }

            this.shaderProgram = program;
            this.testResults.shaderCompilation = true;
            console.log('✓ Programma shader creato e linkato correttamente');

        } catch (error) {
            console.error('❌ Errore nella compilazione degli shader:', error);
            throw error;
        }
    }

    testUniformLocations() {
        if (!this.shaderProgram) {
            console.error('❌ Programma shader non disponibile');
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
            'uShininess'
        ];

        this.gl.useProgram(this.shaderProgram);
        
        const missingUniforms = [];
        for (const uniform of requiredUniforms) {
            const location = this.gl.getUniformLocation(this.shaderProgram, uniform);
            if (location === null) {
                missingUniforms.push(uniform);
            }
        }

        if (missingUniforms.length === 0) {
            console.log('✓ Tutte le uniform sono presenti e accessibili');
            this.testResults.uniformLocations = true;
        } else {
            console.error('❌ Uniform mancanti:', missingUniforms);
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

            if (this.gl.getError() === this.gl.NO_ERROR) {
                console.log('✓ Texture binding funzionante');
                this.testResults.textureBinding = true;
            } else {
                console.error('❌ Errore nel binding delle texture');
            }
        } catch (error) {
            console.error('❌ Errore nel test delle texture:', error);
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
                color: [1, 1, 1],
                intensity: 1.0
            };

            const lightPosLoc = this.gl.getUniformLocation(this.shaderProgram, 'uLightPosition');
            const lightColorLoc = this.gl.getUniformLocation(this.shaderProgram, 'uLightColor');
            
            if (lightPosLoc === null || lightColorLoc === null) {
                throw new Error('Location delle uniform della luce non trovate');
            }

            this.gl.uniform3fv(lightPosLoc, new Float32Array(testLight.position));
            this.gl.uniform3fv(lightColorLoc, new Float32Array(testLight.color));

            if (this.gl.getError() === this.gl.NO_ERROR) {
                console.log('✓ Setup illuminazione funzionante');
                this.testResults.lightingSetup = true;
            } else {
                console.error('❌ Errore nel setup dell\'illuminazione');
            }
        } catch (error) {
            console.error('❌ Errore nel test dell\'illuminazione:', error);
        }
    }

    printResults() {
        console.log('\nRisultati dei test:');
        console.log('--------------------');
        Object.entries(this.testResults).forEach(([test, passed]) => {
            console.log(`${passed ? '✓' : '❌'} ${test}: ${passed ? 'OK' : 'FALLITO'}`);
        });

        const allPassed = Object.values(this.testResults).every(result => result);
        console.log('\nStato generale:', allPassed ? '✓ Tutti i test passati' : '❌ Alcuni test falliti');
    }
}

// Export per uso globale
window.ShaderTestUtils = ShaderTestUtils;