// shader-loader.js
class ShaderLoader {
    constructor(gl) {
        this.gl = gl;
    }

    async loadShaders() {
        try {
            // Carica gli shader da file
            const vertexShader = await this.loadShaderFile('vertex-shader.glsl');
            const fragmentShader = await this.loadShaderFile('fragment-shader.glsl');
            const shadowVertexShader = await this.loadShaderFile('shadow-vertex-shader.glsl');
            const shadowFragmentShader = await this.loadShaderFile('shadow-fragment-shader.glsl');

            // Crea i programmi shader
            const mainProgram = this.createProgram(vertexShader, fragmentShader);
            const shadowProgram = this.createProgram(shadowVertexShader, shadowFragmentShader);

            return {
                mainProgram,
                shadowProgram
            };
        } catch (error) {
            console.error('Error loading shaders:', error);
            throw error;
        }
    }

    async loadShaderFile(filename) {
        try {
            const response = await fetch(filename);
            if (!response.ok) {
                throw new Error(`Failed to load ${filename}`);
            }
            return await response.text();
        } catch (error) {
            console.error(`Error loading shader file ${filename}:`, error);
            throw error;
        }
    }

    createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            const error = new Error(`Shader compile error: ${this.gl.getShaderInfoLog(shader)}`);
            this.gl.deleteShader(shader);
            throw error;
        }

        return shader;
    }

    createProgram(vertexSource, fragmentSource) {
        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentSource);

        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);

        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            const error = new Error(`Shader program link error: ${this.gl.getProgramInfoLog(program)}`);
            this.gl.deleteProgram(program);
            throw error;
        }

        return program;
    }
}