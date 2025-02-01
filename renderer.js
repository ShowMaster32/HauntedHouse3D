// renderer.js
class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl2');
        if (!this.gl) {
            throw new Error('WebGL 2 not available');
        }

        this.meshes = new Map();
        this.textures = new Map();
        this.programs = new Map();
        
        // Camera setup
        this.camera = {
            position: [0, 4, 10],
            target: [0, 0, 0],
            up: [0, 1, 0],
            fov: 70 * Math.PI / 180,
            near: 0.1,
            far: 1000,
            rotation: [0, 0, 0]
        };

        // Light setup
        this.light = {
            position: [0, 9, 0],
            color: [1, 0.95, 0.8],
            intensity: 100,
            enabled: true
        };

        // Rendering settings
        this.settings = {
            shadows: true,
            reflections: true,
            advancedRendering: false
        };

        this.setupGL();
        this.setupShaders();
        this.setupShadowMapping();
        this.setupGUI();
        
        // Bind resize handler
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    setupGL() {
        const gl = this.gl;
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
    }

    setupShaders() {
        // Main rendering program
        const mainVertexShader = `#version 300 es
            in vec4 aPosition;
            in vec2 aTextureCoord;
            in vec3 aNormal;
            
            uniform mat4 uModelViewMatrix;
            uniform mat4 uProjectionMatrix;
            uniform mat4 uNormalMatrix;
            uniform mat4 uLightSpaceMatrix;
            
            out vec2 vTextureCoord;
            out vec3 vNormal;
            out vec3 vPosition;
            out vec4 vPositionFromLight;
            
            void main() {
                vTextureCoord = aTextureCoord;
                vNormal = (uNormalMatrix * vec4(aNormal, 0.0)).xyz;
                vec4 position = uModelViewMatrix * aPosition;
                vPosition = position.xyz;
                vPositionFromLight = uLightSpaceMatrix * aPosition;
                gl_Position = uProjectionMatrix * position;
            }`;

        const mainFragmentShader = `#version 300 es
            precision highp float;
            
            in vec2 vTextureCoord;
            in vec3 vNormal;
            in vec3 vPosition;
            in vec4 vPositionFromLight;
            
            uniform sampler2D uSampler;
            uniform sampler2D uShadowMap;
            uniform vec3 uLightPosition;
            uniform vec3 uLightColor;
            uniform float uLightIntensity;
            uniform bool uShadowsEnabled;
            uniform bool uReflectionsEnabled;
            
            out vec4 fragColor;
            
            float calculateShadow() {
                vec3 projCoords = vPositionFromLight.xyz / vPositionFromLight.w;
                projCoords = projCoords * 0.5 + 0.5;
                
                float closestDepth = texture(uShadowMap, projCoords.xy).r;
                float currentDepth = projCoords.z;
                
                float bias = 0.005;
                float shadow = currentDepth - bias > closestDepth ? 0.5 : 1.0;
                
                return shadow;
            }
            
            void main() {
                vec3 normal = normalize(vNormal);
                vec3 lightDir = normalize(uLightPosition - vPosition);
                float diff = max(dot(normal, lightDir), 0.0);
                
                vec4 texColor = texture(uSampler, vTextureCoord);
                float shadow = uShadowsEnabled ? calculateShadow() : 1.0;
                
                vec3 ambient = 0.3 * texColor.rgb * uLightColor;
                vec3 diffuse = 0.7 * diff * texColor.rgb * uLightColor * uLightIntensity;
                
                if (uReflectionsEnabled) {
                    vec3 viewDir = normalize(-vPosition);
                    vec3 reflectDir = reflect(-lightDir, normal);
                    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
                    vec3 specular = 0.2 * spec * uLightColor;
                    fragColor = vec4((ambient + shadow * (diffuse + specular)), texColor.a);
                } else {
                    fragColor = vec4((ambient + shadow * diffuse), texColor.a);
                }
            }`;

        // Shadow mapping program
        const shadowVertexShader = `#version 300 es
            in vec4 aPosition;
            uniform mat4 uLightSpaceMatrix;
            uniform mat4 uModelMatrix;
            
            void main() {
                gl_Position = uLightSpaceMatrix * uModelMatrix * aPosition;
            }`;

        const shadowFragmentShader = `#version 300 es
            precision highp float;
            out vec4 fragColor;
            
            void main() {
                fragColor = vec4(gl_FragCoord.z, 0.0, 0.0, 1.0);
            }`;

        this.programs.set('main', this.createProgram(mainVertexShader, mainFragmentShader));
        this.programs.set('shadow', this.createProgram(shadowVertexShader, shadowFragmentShader));
    }

    createProgram(vertexSource, fragmentSource) {
        const gl = this.gl;
        const program = gl.createProgram();
        
        const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentSource);
        
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error(`Shader program failed to link: ${gl.getProgramInfoLog(program)}`);
        }
        
        return program;
    }

    createShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error(`Shader compile error: ${gl.getShaderInfoLog(shader)}`);
        }
        
        return shader;
    }

    setupShadowMapping() {
        const gl = this.gl;
        const shadowMapSize = 1024;
        
        // Create shadow framebuffer and texture
        this.shadowFramebuffer = gl.createFramebuffer();
        this.shadowTexture = gl.createTexture();
        
        gl.bindTexture(gl.TEXTURE_2D, this.shadowTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24,
                     shadowMapSize, shadowMapSize, 0,
                     gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFramebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT,
                               gl.TEXTURE_2D, this.shadowTexture, 0);
    }

    async loadMesh(name, objUrl, mtlUrl = null) {
        const response = await fetch(objUrl);
        const objText = await response.text();
        
        const mesh = glmUtils.loadObj(objText);
        
        const meshData = {
            vertices: this.createBuffer(mesh.vertices),
            normals: this.createBuffer(mesh.normals),
            texCoords: this.createBuffer(mesh.texCoords),
            indices: this.createBuffer(mesh.indices, gl.ELEMENT_ARRAY_BUFFER),
            numIndices: mesh.indices.length
        };
        
        this.meshes.set(name, meshData);
        return meshData;
    }

    createBuffer(data, target = this.gl.ARRAY_BUFFER) {
        const gl = this.gl;
        const buffer = gl.createBuffer();
        gl.bindBuffer(target, buffer);
        
        const typedArray = target === gl.ARRAY_BUFFER ? 
            new Float32Array(data) : new Uint16Array(data);
        
        gl.bufferData(target, typedArray, gl.STATIC_DRAW);
        return buffer;
    }

    async loadTexture(name, url) {
        const gl = this.gl;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);

        // Placeholder white pixel
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                     new Uint8Array([255, 255, 255, 255]));

        const image = new Image();
        image.src = url;
        await new Promise(resolve => {
            image.onload = () => {
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
                gl.generateMipmap(gl.TEXTURE_2D);
                resolve();
            };
        });

        this.textures.set(name, texture);
        return texture;
    }

    updateCamera(position, target, up) {
        Object.assign(this.camera, { position, target, up });
    }

    getCameraViewMatrix() {
        return m4.lookAt(this.camera.position, this.camera.target, this.camera.up);
    }

    getCameraProjectionMatrix() {
        const aspect = this.gl.canvas.clientWidth / this.gl.canvas.clientHeight;
        return m4.perspective(this.camera.fov, aspect, this.camera.near, this.camera.far);
    }

    getLightSpaceMatrix() {
        const lightView = m4.lookAt(this.light.position, [0, 0, 0], [0, 1, 0]);
        const lightProjection = m4.ortho(-20, 20, -20, 20, -20, 40);
        return m4.multiply(lightProjection, lightView);
    }

    render(scene) {
        const gl = this.gl;
        
        // First render pass: shadow mapping
        if (this.settings.shadows) {
            this.renderShadowMap(scene);
        }
        
        // Second render pass: main rendering
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        const program = this.programs.get('main');
        gl.useProgram(program);
        
        // Set up uniforms
        this.setMainProgramUniforms(program);
        
        // Render each object
        scene.traverse(object => {
            if (object.mesh && object.texture) {
                this.renderObject(object, program);
            }
        });
    }

    renderShadowMap(scene) {
        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFramebuffer);
        gl.viewport(0, 0, 1024, 1024);
        gl.clear(gl.DEPTH_BUFFER_BIT);
        
        const program = this.programs.get('shadow');
        gl.useProgram(program);
        
        const lightSpaceMatrix = this.getLightSpaceMatrix();
        gl.uniformMatrix4fv(
            gl.getUniformLocation(program, 'uLightSpaceMatrix'),
            false,
            lightSpaceMatrix
        );
        
        scene.traverse(object => {
            if (object.mesh) {
                this.renderObjectShadow(object, program);
            }
        });
    }

    setMainProgramUniforms(program) {
        const gl = this.gl;
        
        const viewMatrix = this.getCameraViewMatrix();
        const projectionMatrix = this.getCameraProjectionMatrix();
        const lightSpaceMatrix = this.getLightSpaceMatrix();
        
        gl.uniformMatrix4fv(
            gl.getUniformLocation(program, 'uViewMatrix'),
            false,
            viewMatrix
        );
        
        gl.uniformMatrix4fv(
            gl.getUniformLocation(program, 'uProjectionMatrix'),
            false,
            projectionMatrix
        );
        
        gl.uniformMatrix4fv(
            gl.getUniformLocation(program, 'uLightSpaceMatrix'),
            false,
            lightSpaceMatrix
        );
        
        gl.uniform3fv(
            gl.getUniformLocation(program, 'uLightPosition'),
            this.light.position
        );
        
        gl.uniform3fv(
            gl.getUniformLocation(program, 'uLightColor'),
            this.light.color
        );
        
        gl.uniform1f(
            gl.getUniformLocation(program, 'uLightIntensity'),
            this.light.intensity
        );
        
        gl.uniform1i(
            gl.getUniformLocation(program, 'uShadowsEnabled'),
            this.settings.shadows
        );
        
        gl.uniform1i(
            gl.getUniformLocation(program, 'uReflectionsEnabled'),
            this.settings.reflections
        );
    }

    renderObject(object, program) {
        const gl = this.gl;
        const mesh = this.meshes.get(object.mesh);
        
        // Set up vertex attributes
        this.setupVertexAttributes(program, mesh);
        
        // Set up textures
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textures.get(object.texture));
        gl.uniform1i(gl.getUniformLocation(program, 'uSampler'), 0);
        
        if (this.settings.shadows) {
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, this.shadowTexture);
            gl.uniform1i(gl.getUniformLocation(program, 'uShadowMap'), 1);
        }
        
        // Set up model matrix
        const modelMatrix = m4.identity();
        m4.translate(modelMatrix, object.position[0], object.position[1], object.position[2]);
        m4.rotateX(modelMatrix, object.rotation[0]);
        m4.rotateY(modelMatrix, object.rotation[1]);
        m4.rotateZ(modelMatrix, object.rotation[2]);
        m4.scale(modelMatrix, object.scale[0], object.scale[1], object.scale[2]);
        
        gl.uniformMatrix4fv(
            gl.getUniformLocation(program, 'uModelMatrix'),
            false,
            modelMatrix
        );
        
        // Calculate and set normal matrix
        const normalMatrix = m4.inverse(m4.transpose(modelMatrix));
        gl.uniformMatrix4fv(
            gl.getUniformLocation(program, 'uNormalMatrix'),
            false,
            normalMatrix
        );
        
        // Draw the object
        gl.drawElements(gl.TRIANGLES, mesh.numIndices, gl.UNSIGNED_SHORT, 0);
    }

    renderObjectShadow(object, program) {
        const gl = this.gl;
        const mesh = this.meshes.get(object.mesh);
        
        this.setupVertexAttributes(program, mesh);
        
        const modelMatrix = m4.identity();
        m4.translate(modelMatrix, object.position[0], object.position[1], object.position[2]);
        m4.rotateX(modelMatrix, object.rotation[0]);
        m4.rotateY(modelMatrix, object.rotation[1]);
        m4.rotateZ(modelMatrix, object.rotation[2]);
        m4.scale(modelMatrix, object.scale[0], object.scale[1], object.scale[2]);
        
        gl.uniformMatrix4fv(
            gl.getUniformLocation(program, 'uModelMatrix'),
            false,
            modelMatrix
        );
        
        gl.drawElements(gl.TRIANGLES, mesh.numIndices, gl.UNSIGNED_SHORT, 0);
    }

    setupVertexAttributes(program, mesh) {
        const gl = this.gl;
        
        // Position attribute
        const positionLocation = gl.getAttribLocation(program, 'aPosition');
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertices);
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
        
        // Normal attribute
        const normalLocation = gl.getAttribLocation(program, 'aNormal');
        if (normalLocation !== -1) {
            gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normals);
            gl.enableVertexAttribArray(normalLocation);
            gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);
        }
        
        // Texture coordinate attribute
        const texCoordLocation = gl.getAttribLocation(program, 'aTextureCoord');
        if (texCoordLocation !== -1) {
            gl.bindBuffer(gl.ARRAY_BUFFER, mesh.texCoords);
            gl.enableVertexAttribArray(texCoordLocation);
            gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
        }
        
        // Bind index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indices);
    }

    setupGUI() {
        const gui = new dat.GUI({ autoPlace: false });
        document.getElementById('gui-container').appendChild(gui.domElement);

        const renderFolder = gui.addFolder('Rendering Settings');
        renderFolder.add(this.settings, 'shadows').name('Enable Shadows');
        renderFolder.add(this.settings, 'reflections').name('Enable Reflections');
        renderFolder.add(this.settings, 'advancedRendering').name('Advanced Rendering');
        renderFolder.open();

        const lightFolder = gui.addFolder('Light Settings');
        lightFolder.add(this.light, 'intensity', 0, 200).name('Light Intensity');
        lightFolder.addColor(this.light, 'color').name('Light Color');
        lightFolder.open();
    }

    onWindowResize() {
        const gl = this.gl;
        const canvas = gl.canvas;
        
        // Update canvas size
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }

    toggleShadows() {
        this.settings.shadows = !this.settings.shadows;
    }

    toggleReflections() {
        this.settings.reflections = !this.settings.reflections;
    }

    toggleAdvancedRendering() {
        this.settings.advancedRendering = !this.settings.advancedRendering;
        if (this.settings.advancedRendering) {
            // Abilita impostazioni avanzate
            this.gl.enable(this.gl.SAMPLE_ALPHA_TO_COVERAGE);
            this.light.intensity = 150;
        } else {
            // Ripristina impostazioni standard
            this.gl.disable(this.gl.SAMPLE_ALPHA_TO_COVERAGE);
            this.light.intensity = 100;
        }
    }

    setLightEnabled(enabled) {
        this.light.enabled = enabled;
        if (enabled) {
            // Effetto sfarfallio quando la luce viene accesa
            this.flickerLight();
        }
    }

    flickerLight() {
        const originalIntensity = this.light.intensity;
        let flickerCount = Math.floor(Math.random() * 5) + 3;
        
        const flicker = () => {
            if (flickerCount > 0) {
                this.light.intensity = Math.random() * originalIntensity * 1.5;
                flickerCount--;
                setTimeout(flicker, Math.random() * 100);
            } else {
                this.light.intensity = originalIntensity;
            }
        };
        
        flicker();
    }
}

// Esporta la classe
export default Renderer;