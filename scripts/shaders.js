// shaders.js
export const Shaders = {
    // Vertex shader base con supporto per illuminazione e texture
    vertexShaderSource: `
        attribute vec4 aVertexPosition;       // MODIFICATO
        attribute vec2 aTextureCoord;
        attribute vec3 aVertexNormal;         // MODIFICATO
        
        uniform mat4 uModelViewMatrix;
        uniform mat4 uProjectionMatrix;
        uniform mat4 uNormalMatrix;
        
        varying vec2 vTextureCoord;
        varying vec3 vNormal;
        varying vec3 vFragPos;
        
        void main(void) {
            gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;  // MODIFICATO
            vTextureCoord = aTextureCoord;
            vNormal = mat3(uNormalMatrix) * aVertexNormal;                        // MODIFICATO
            vFragPos = vec3(uModelViewMatrix * aVertexPosition);                  // MODIFICATO
        }
    `,

    // Fragment shader rimane lo stesso
    fragmentShaderSource: `
        precision mediump float;
        
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
            
            if (uLightEnabled) {
                // Illuminazione ambientale
                vec3 ambient = uAmbientStrength * uLightColor;
                
                // Illuminazione diffusa
                vec3 norm = normalize(vNormal);
                vec3 lightDir = normalize(uLightPosition - vFragPos);
                float diff = max(dot(norm, lightDir), 0.0);
                vec3 diffuse = diff * uLightColor;
                
                // Illuminazione speculare
                float specularStrength = 0.5;
                vec3 viewDir = normalize(-vFragPos);
                vec3 reflectDir = reflect(-lightDir, norm);
                float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
                vec3 specular = specularStrength * spec * uLightColor;
                
                vec3 result = (ambient + diffuse + specular) * vec3(texColor);
                gl_FragColor = vec4(result, texColor.a);
            } else {
                vec3 ambient = vec3(0.1) * vec3(texColor);
                gl_FragColor = vec4(ambient, texColor.a);
            }
        }
    `,

    // Il resto del codice rimane invariato
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