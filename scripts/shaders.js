export const Shaders = {
    vertexShaderSource: `
    attribute vec4 aVertexPosition;
    attribute vec2 aTextureCoord;
    attribute vec3 aVertexNormal;
    attribute vec3 aTangent;
    attribute vec3 aBitangent;
    
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform mat4 uNormalMatrix;
    
    varying vec2 vTextureCoord;
    varying vec3 vNormal;
    varying vec3 vTangent;
    varying vec3 vBitangent;
    varying vec3 vFragPos;
    
    void main(void) {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        vTextureCoord = aTextureCoord;
        
        // Calcola lo spazio tangente per il normal mapping
        vNormal = normalize(mat3(uNormalMatrix) * aVertexNormal);
        vTangent = normalize(mat3(uNormalMatrix) * aTangent);
        vBitangent = normalize(mat3(uNormalMatrix) * aBitangent);
        
        vFragPos = vec3(uModelViewMatrix * aVertexPosition);
    }
`,
    
    fragmentShaderSource: `
    precision highp float;
    
    varying vec2 vTextureCoord;
    varying vec3 vNormal;
    varying vec3 vTangent;
    varying vec3 vBitangent;
    varying vec3 vFragPos;
    
    uniform sampler2D uDiffuse;
    uniform sampler2D uNormal;
    uniform sampler2D uRoughness;
    uniform vec3 uLightPosition;
    uniform vec3 uLightColor;
    uniform bool uLightEnabled;
    uniform float uAmbientStrength;
    
    void main(void) {
        // Texture sampling
        vec4 diffuseColor = texture2D(uDiffuse, vTextureCoord);
        vec3 normalMap = texture2D(uNormal, vTextureCoord).rgb * 2.0 - 1.0;
        float roughness = texture2D(uRoughness, vTextureCoord).r;
        
        // Costruisci la matrice TBN per il normal mapping
        mat3 TBN = mat3(normalize(vTangent), normalize(vBitangent), normalize(vNormal));
        vec3 normal = normalize(TBN * normalMap);
        
        // Calcoli di illuminazione
        vec3 lightDir = normalize(uLightPosition - vFragPos);
        float diff = max(dot(normal, lightDir), 0.0);
        
        // Calcolo speculare base PBR
        vec3 viewDir = normalize(-vFragPos);
        vec3 halfwayDir = normalize(lightDir + viewDir);
        float spec = pow(max(dot(normal, halfwayDir), 0.0), 32.0);
        float specStrength = (1.0 - roughness) * 0.5;
        
        vec3 ambient = uAmbientStrength * uLightColor;
        vec3 diffuse = diff * uLightColor;
        vec3 specular = specStrength * spec * uLightColor;
        
        vec3 result = (ambient + diffuse + specular) * diffuseColor.rgb;
        gl_FragColor = vec4(result, diffuseColor.a);
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