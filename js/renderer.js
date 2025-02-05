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
        
        this.settings = {
            shadows: true,
            reflections: true,
            advancedRendering: false,
            debug: {
                meshLoading: true,
                renderingSteps: true,
                sceneObjects: true,
                playerPosition: true
            }
        };
        
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
        
        this.setupGL();
        this.meshes.set('plane', this.createPlaneMesh());
        this.setupLighting();
        this.setupGUI();
        
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }
    
    async initialize() {
        try {
            console.log('Initializing renderer...');
            
            // Carica gli shader dai file corretti
            const vertexShaderText = await fetch('shaders/vertex-shader.glsl').then(r => r.text());
            const fragmentShaderText = await fetch('shaders/fragment-shader.glsl').then(r => r.text());
            const shadowVertexShaderText = await fetch('shaders/shadow-vertex-shader.glsl').then(r => r.text());
            const shadowFragmentShaderText = await fetch('shaders/shadow-fragment-shader.glsl').then(r => r.text());
            
            // Crea i programmi shader
            this.programs.set('main', this.createProgram(vertexShaderText, fragmentShaderText));
            this.programs.set('shadow', this.createProgram(shadowVertexShaderText, shadowFragmentShaderText));
            
            this.setupShadowMapping();
            
            console.log('Renderer initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize renderer:', error);
            throw error;
        }
    }
    
    setupLighting() {
        // Luce principale (lampadario)
        if (!this.scene) {
            this.scene = {
                lights: new Map()
            };
        }
        
        this.scene.lights.set('mainLight', {
            type: 'point',
            position: [0, 8, 0],
            color: [1, 1, 1],
            intensity: 300,
            enabled: true
        });
        
        // Luce ambientale più intensa
        this.scene.lights.set('ambient', {
            type: 'ambient',
            color: [0.3, 0.3, 0.3],
            intensity: 0.5
        });
        
        // Aggiorna anche la luce principale della classe
        this.light = {
            position: [0, 8, 0],
            color: [1, 1, 1],
            intensity: 300,
            enabled: true
        };
    }
    
    setupGL() {
        const gl = this.gl;
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
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
                try {
                    if (this.settings.debug.meshLoading) {
                        console.log(`Caricamento mesh ${name} da ${objUrl}`);
                    }
                    
                    const response = await fetch(objUrl);
                    const objText = await response.text();
                    
                    if (typeof window.glmUtils === 'undefined') {
                        throw new Error('glmUtils non è stato caricato correttamente');
                    }
                    
                    const mesh = window.glmUtils.loadObj(objText);
                    const gl = this.gl;
                    
                    const meshData = {
                        vertices: this.createBuffer(mesh.vertices),
                        normals: this.createBuffer(mesh.normals),
                        texCoords: this.createBuffer(mesh.texCoords),
                        indices: this.createBuffer(mesh.indices, gl.ELEMENT_ARRAY_BUFFER),
                        numIndices: mesh.indices.length
                    };
                    
                    if (this.settings.debug.meshLoading) {
                        console.log(`Mesh ${name} caricata con successo:`, meshData);
                    }
                    
                    this.meshes.set(name, meshData);
                    return meshData;
                } catch (error) {
                    console.error('Errore nel caricamento della mesh:', error);
                    throw error;
                }
            }
            
            createBuffer(data, target = null) {
                const gl = this.gl;
                target = target || gl.ARRAY_BUFFER;
                
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
                    
                    // Usa un colore di clear più chiaro per debug
                    gl.clearColor(0.2, 0.2, 0.2, 1.0);
                    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
                    
                    // Posiziona la camera più in alto e indietro
                    this.camera.position = [0, 5, 15];
                    this.camera.target = [0, 0, 0];
                    
                    // Aumenta l'intensità della luce
                    this.light.intensity = 200;
                    
                    if (this.settings.debug.renderingSteps) {
                        console.log('Inizio rendering frame');
                    }
                    
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
                    if (scene.objects && scene.objects instanceof Map) {
                        scene.objects.forEach((object, key) => {
                            if (object.mesh && object.texture) {
                                this.renderObject(object, program);
                            }
                        });
                    }
                    
                    // Render lights if they exist
                    if (scene.lights && scene.lights instanceof Map) {
                        scene.lights.forEach((light, key) => {
                            // Aggiorna le uniforms per le luci
                            const lightPosLoc = gl.getUniformLocation(program, 'uLightPosition');
                            const lightColorLoc = gl.getUniformLocation(program, 'uLightColor');
                            const lightIntensityLoc = gl.getUniformLocation(program, 'uLightIntensity');
                            
                            if (lightPosLoc && light.position) {
                                gl.uniform3fv(lightPosLoc, light.position);
                            }
                            if (lightColorLoc && light.color) {
                                gl.uniform3fv(lightColorLoc, light.color);
                            }
                            if (lightIntensityLoc && light.intensity) {
                                gl.uniform1f(lightIntensityLoc, light.intensity);
                            }
                        });
                    }
                    if (this.settings.debug.sceneObjects && scene.objects) {
                        console.log('Scene objects:', scene.objects);
                    }
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
                    
                    // Itera sugli oggetti della scena
                    if (scene.objects && scene.objects instanceof Map) {
                        scene.objects.forEach((object, key) => {
                            if (object.mesh) {
                                this.renderObjectShadow(object, program);
                            }
                        });
                    }
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
                    if (!object || !object.mesh) {
                        return;
                    }
                    const mesh = this.meshes.get(object.mesh);
                    if (!mesh) {
                        console.error(`Mesh non trovata: ${object.mesh}`);
                        return;
                    }
                    const gl = this.gl;
                    
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
                    if (!object || !object.mesh) {
                        return;
                    }
                    const mesh = this.meshes.get(object.mesh);
                    if (!mesh) {
                        console.error(`Mesh non trovata: ${object.mesh}`);
                        return;
                    }
                    const gl = this.gl;
                    
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
                    
                    if (!mesh) {
                        console.error('Mesh non trovata');
                        return;
                    }
                    
                    // Position attribute
                    const positionLocation = gl.getAttribLocation(program, 'aPosition');
                    if (positionLocation !== -1 && mesh.vertices) {
                        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertices);
                        gl.enableVertexAttribArray(positionLocation);
                        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
                    }
                    
                    // Normal attribute
                    const normalLocation = gl.getAttribLocation(program, 'aNormal');
                    if (normalLocation !== -1 && mesh.normals) {
                        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normals);
                        gl.enableVertexAttribArray(normalLocation);
                        gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);
                    }
                    
                    // Texture coordinate attribute
                    const texCoordLocation = gl.getAttribLocation(program, 'aTextureCoord');
                    if (texCoordLocation !== -1 && mesh.texCoords) {
                        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.texCoords);
                        gl.enableVertexAttribArray(texCoordLocation);
                        gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
                    }
                    
                    // Bind index buffer
                    if (mesh.indices) {
                        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indices);
                    }
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
                    
                    // Aggiungi cartella per i debug log
                    const debugFolder = gui.addFolder('Debug Settings');
                    this.settings.debug = {
                        meshLoading: true,
                        renderingSteps: true,
                        sceneObjects: true,
                        playerPosition: true
                    };
                    
                    debugFolder.add(this.settings.debug, 'meshLoading').name('Mesh Loading Logs');
                    debugFolder.add(this.settings.debug, 'renderingSteps').name('Rendering Logs');
                    debugFolder.add(this.settings.debug, 'sceneObjects').name('Scene Objects Logs');
                    debugFolder.add(this.settings.debug, 'playerPosition').name('Player Position Logs');
                    debugFolder.open();
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
                
                createPlaneMesh() {
                    const vertices = new Float32Array([
                        -1, 0, -1,  // bottom-left
                        1, 0, -1,  // bottom-right
                        1, 0,  1,  // top-right
                        -1, 0,  1,  // top-left
                    ]);
                    
                    const normals = new Float32Array([
                        0, 1, 0,
                        0, 1, 0,
                        0, 1, 0,
                        0, 1, 0,
                    ]);
                    
                    const texCoords = new Float32Array([
                        0, 0,
                        1, 0,
                        1, 1,
                        0, 1,
                    ]);
                    
                    const indices = new Uint16Array([
                        0, 1, 2,
                        0, 2, 3,
                    ]);
                    
                    return {
                        vertices: this.createBuffer(vertices),
                        normals: this.createBuffer(normals),
                        texCoords: this.createBuffer(texCoords),
                        indices: this.createBuffer(indices, this.gl.ELEMENT_ARRAY_BUFFER),
                        numIndices: indices.length
                    };
                }
            }
            
            
            // Esporta la classe
            window.Renderer = Renderer;