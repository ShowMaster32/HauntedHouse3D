export const Shaders = {
    vertexShaderSource: `
        attribute vec4 aVertexPosition;
        attribute vec2 aTextureCoord;
        attribute vec3 aVertexNormal;
        
        uniform mat4 uModelViewMatrix;
        uniform mat4 uProjectionMatrix;
        uniform mat4 uNormalMatrix;
        
        varying vec2 vTextureCoord;
        varying vec3 vNormal;
        varying vec3 vFragPos;
        
        void main(void) {
            gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
            vTextureCoord = aTextureCoord;
            vNormal = normalize(mat3(uNormalMatrix) * aVertexNormal);  // Normalizzato qui
            vFragPos = vec3(uModelViewMatrix * aVertexPosition);
        }
    `,

    fragmentShaderSource: `
        precision highp float;  // Aumentato la precisione
        
        varying vec2 vTextureCoord;
        varying vec3 vNormal;
        varying vec3 vFragPos;
        
        uniform sampler2D uSampler;
        uniform vec3 uLightPosition;
        uniform vec3 uLightColor;
        uniform bool uLightEnabled;
        uniform float uAmbientStrength;
        
        void main(void) {
            vec4 texColor = texture2D(uSampler, vTextureCoord);
            
            // Base visibility assicurata
            float baseLighting = 0.3;
            
            if (uLightEnabled) {
                // Illuminazione ambientale aumentata
                vec3 ambient = max(uAmbientStrength, 0.4) * uLightColor;
                
                // Illuminazione diffusa migliorata
                vec3 norm = normalize(vNormal);
                vec3 lightDir = normalize(uLightPosition - vFragPos);
                float diff = max(dot(norm, lightDir), 0.2);  // Minimo 0.2 per visibilità base
                vec3 diffuse = diff * uLightColor;
                
                // Illuminazione speculare ridotta
                float specularStrength = 0.3;
                vec3 viewDir = normalize(-vFragPos);
                vec3 reflectDir = reflect(-lightDir, norm);
                float spec = pow(max(dot(viewDir, reflectDir), 0.0), 16.0);  // Esponente ridotto
                vec3 specular = specularStrength * spec * uLightColor;
                
                // Combina gli effetti con pesi modificati
                vec3 result = (ambient * 0.5 + diffuse * 0.8 + specular * 0.3) * vec3(texColor);
                
                // Assicura una luminosità minima
                result = max(result, vec3(baseLighting) * vec3(texColor));
                
                gl_FragColor = vec4(result, texColor.a);
            } else {
                // Fallback con illuminazione base
                vec3 result = vec3(baseLighting) * vec3(texColor);
                gl_FragColor = vec4(result, texColor.a);
            }
        }
    `,

    createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Errore di compilazione shader:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    },

    createProgram(gl, vertexShader, fragmentShader) {
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Errore nel linking del programma:', gl.getProgramInfoLog(program));
            gl.deleteProgram(program);
            return null;
        }
        return program;
    },

    initShaderProgram(gl) {
        const vertexShader = this.createShader(gl, gl.VERTEX_SHADER, this.vertexShaderSource);
        const fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, this.fragmentShaderSource);

        if (!vertexShader || !fragmentShader) {
            return null;
        }

        const program = this.createProgram(gl, vertexShader, fragmentShader);
        if (!program) {
            return null;
        }
        return program;
    }
};