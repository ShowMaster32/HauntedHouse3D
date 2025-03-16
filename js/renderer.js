// renderer.js
// Gestione del rendering WebGL utilizzando solo le librerie consentite

class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = {  // Inizializza la struttura della scena
            lights: new Map(),
            objects: new Map()
        };
        
        // Inizializza WebGL 2
        this.gl = canvas.getContext('webgl2');
        if (!this.gl) {
            throw new Error('WebGL 2 non disponibile');
        }
        
        // Strutture dati per risorse
        this.meshes = new Map();
        this.textures = new Map();
        this.programs = new Map();
        
        // Impostazioni di rendering
        this.settings = {
            shadows: true,
            reflections: true,
            advancedRendering: false,
            debug: {
                meshLoading: true,
                renderingSteps: true,
                sceneObjects: false,
                playerPosition: false,
                lightingStatus: true
            }
        };
        
        // Camera setup
        this.camera = {
            position: [0, 4, 10],
            target: [0, 0, 0],
            up: [0, 1, 0],
            fov: 70 * Math.PI / 180,
            near: 0.1,
            far: 1000
        };
        
        // Luce setup
        this.light = {
            position: [0, 8, 0],
            color: [1, 0.95, 0.8],
            intensity: 150,
            enabled: true,
            attenuation: {
                constant: 1.0,
                linear: 0.014,
                quadratic: 0.0007
            }
        };
        
        // Luce ambientale
        this.ambientLight = {
            color: [0.3, 0.3, 0.35],
            intensity: 0.5,
            strength: 0.5
        };
        
        // Configurazione WebGL di base
        this.setupGL();
        
        // Crea una mesh per un piano (per pareti, pavimento, ecc.)
        this.meshes.set('plane', this.createPlaneMesh());
        
        // Gestione ridimensionamento finestra
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }
    
    // Log per debugging
    log(message, isError = false) {
        if (this.settings.debug.renderingSteps) {
            console.log(isError ? `[RENDERER ERROR] ${message}` : `[RENDERER] ${message}`);
            
            if (typeof logDebug === 'function') {
                logDebug(message, isError ? 'error' : 'info');
            }
        }
    }
    
    // Inizializzazione del renderer
    async initialize() {
        try {
            this.log('Inizializzazione renderer...');
            
            // Carica gli shader
            const shaderLoader = new ShaderLoader(this.gl);
            const shaderPrograms = await shaderLoader.loadShaders();
            
            // Salva i programmi shader
            this.programs.set('main', shaderPrograms.mainProgram);
            this.programs.set('shadow', shaderPrograms.shadowProgram);
            
            // Setup shadow mapping
            this.setupShadowMapping();
            
            // Verifica i programmi
            if (!this.programs.get('main') || !this.programs.get('shadow')) {
                throw new Error('Errore nella creazione dei programmi shader');
            }
            
            // Imposta le uniforms di base
            this.gl.useProgram(this.programs.get('main'));
            this.setMainProgramUniforms(this.programs.get('main'));
            
            this.log('Renderer inizializzato con successo');
            return true;
        } catch (error) {
            this.log('Errore durante l\'inizializzazione del renderer: ' + error, true);
            throw error;
        }
    }
    
    // Setup configurazioni WebGL di base
    setupGL() {
        const gl = this.gl;
        gl.enable(gl.DEPTH_TEST);     // Abilita test di profondità
        gl.enable(gl.CULL_FACE);      // Abilita culling delle facce
        gl.cullFace(gl.BACK);         // Nasconde le facce posteriori
        gl.clearColor(0.1, 0.1, 0.1, 1.0); // Colore di sfondo nero
        gl.enable(gl.BLEND);          // Abilita blending per trasparenza
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); // Blend mode standard
        
        this.log('WebGL configurato');
    }
    
    // Setup framebuffer e texture per shadow mapping
    setupShadowMapping() {
        const gl = this.gl;
        const shadowMapSize = 1024;
        
        // Crea il framebuffer per la shadow map
        this.shadowFramebuffer = gl.createFramebuffer();
        
        // Crea la texture per la shadow map
        this.shadowTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.shadowTexture);
        
        // Texture vuota per shadow map
        gl.texImage2D(
            gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24,
            shadowMapSize, shadowMapSize, 0,
            gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null
        );
        
        // Imposta parametri texture
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        
        // Collega texture al framebuffer come depth attachment
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFramebuffer);
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT,
            gl.TEXTURE_2D, this.shadowTexture, 0
        );
        
        // Nessun color attachment necessario per shadow map
        gl.drawBuffers([gl.NONE]);
        gl.readBuffer(gl.NONE);
        
        // Verifica status framebuffer
        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (status !== gl.FRAMEBUFFER_COMPLETE) {
            this.log('Errore nella configurazione del framebuffer: ' + status, true);
        }
        
        // Torna al framebuffer default
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        
        this.log('Shadow mapping configurato');
    }
    
    // Caricamento di una mesh da file OBJ
    async loadMesh(name, objUrl, mtlUrl = null) {
        try {
            this.log(`Caricamento mesh ${name} da ${objUrl}`);
            
            // Gestione speciale per file FBX o mesh che falliscono il caricamento
            if (objUrl.toLowerCase().endsWith('.fbx')) {
                // Crea una mesh cubica semplice per sostituzione
                const vertices = [
                    // fronte
                    -1.0, -1.0,  1.0,
                     1.0, -1.0,  1.0,
                     1.0,  1.0,  1.0,
                    -1.0,  1.0,  1.0,
                    // retro
                    -1.0, -1.0, -1.0,
                    -1.0,  1.0, -1.0,
                     1.0,  1.0, -1.0,
                     1.0, -1.0, -1.0
                ];
                
                const normals = [
                    // fronte
                    0.0,  0.0,  1.0,
                    0.0,  0.0,  1.0,
                    0.0,  0.0,  1.0,
                    0.0,  0.0,  1.0,
                    // retro
                    0.0,  0.0, -1.0,
                    0.0,  0.0, -1.0,
                    0.0,  0.0, -1.0,
                    0.0,  0.0, -1.0
                ];
                
                const texCoords = [
                    // fronte
                    0.0,  0.0,
                    1.0,  0.0,
                    1.0,  1.0,
                    0.0,  1.0,
                    // retro
                    0.0,  0.0,
                    1.0,  0.0,
                    1.0,  1.0,
                    0.0,  1.0
                ];
                
                const indices = [
                    0, 1, 2,      0, 2, 3,    // fronte
                    4, 5, 6,      4, 6, 7,    // retro
                    5, 3, 2,      5, 2, 6,    // top
                    4, 7, 1,      4, 1, 0,    // bottom
                    7, 6, 2,      7, 2, 1,    // destra
                    4, 0, 3,      4, 3, 5     // sinistra
                ];
                
                const meshData = {
                    vertices: this.createBuffer(new Float32Array(vertices)),
                    normals: this.createBuffer(new Float32Array(normals)),
                    texCoords: this.createBuffer(new Float32Array(texCoords)),
                    indices: this.createBuffer(new Uint16Array(indices), this.gl.ELEMENT_ARRAY_BUFFER),
                    numIndices: indices.length
                };
                
                this.meshes.set(name, meshData);
                this.log(`Creata mesh sostitutiva per ${name} (${meshData.numIndices} indici)`);
                return meshData;
            }
            
            // Verifica se glmUtils esiste, se non esiste usa il loader OBJ personalizzato
            if (typeof glmUtils === 'undefined' || !glmUtils.loadObj) {
                // Carica il file OBJ manualmente
                const response = await fetch(objUrl);
                const objText = await response.text();
                
                // Crea una nuova mesh vuota
                const mesh = {
                    vert: [null],
                    normal: [{i: 0, j: 0, k: 0}],
                    textCoords: [{u: 0, v: 0, w: 0}],
                    face: [null],
                    nvert: 0,
                    nface: 0,
                    groups: [],
                    materials: [],
                    facetnorms: []
                };
                
                // Usa le funzioni già definite nel file glm_utils.js
                glmReadOBJ(objText, mesh);
                
                // Converte la mesh nel formato atteso dal renderer
                const vertices = [];
                const normals = [];
                const texCoords = [];
                const indices = [];
                
                // Estrai vertici
                for (let i = 1; i < mesh.vert.length; i++) {
                    vertices.push(mesh.vert[i].x, mesh.vert[i].y, mesh.vert[i].z);
                }
                
                // Estrai normali
                for (let i = 1; i < mesh.normal.length; i++) {
                    normals.push(mesh.normal[i].i, mesh.normal[i].j, mesh.normal[i].k);
                }
                
                // Estrai coordinate texture
                for (let i = 1; i < mesh.textCoords.length; i++) {
                    texCoords.push(mesh.textCoords[i].u, mesh.textCoords[i].v);
                }
                
                // Estrai indici delle facce
                for (let i = 1; i < mesh.face.length; i++) {
                    const face = mesh.face[i];
                    indices.push(face.vert[0] - 1, face.vert[1] - 1, face.vert[2] - 1);
                }
                
                // Converti in array tipizzati
                const meshData = {
                    vertices: new Float32Array(vertices),
                    normals: new Float32Array(normals),
                    texCoords: new Float32Array(texCoords),
                    indices: new Uint16Array(indices)
                };
                
                // Crea i buffer
                const gl = this.gl;
                const bufferData = {
                    vertices: this.createBuffer(meshData.vertices),
                    normals: this.createBuffer(meshData.normals),
                    texCoords: this.createBuffer(meshData.texCoords),
                    indices: this.createBuffer(meshData.indices, gl.ELEMENT_ARRAY_BUFFER),
                    numIndices: meshData.indices.length
                };
                
                // Memorizza la mesh
                this.meshes.set(name, bufferData);
                
                if (this.settings.debug.meshLoading) {
                    this.log(`Mesh ${name} caricata con ${meshData.vertices.length/3} vertici`);
                }
                
                return bufferData;
            } else {
                // Usa glmUtils.loadObj se disponibile
                const response = await fetch(objUrl);
                const objText = await response.text();
                
                const mesh = glmUtils.loadObj(objText);
                const gl = this.gl;
                
                const meshData = {
                    vertices: this.createBuffer(mesh.vertices),
                    normals: this.createBuffer(mesh.normals),
                    texCoords: this.createBuffer(mesh.texCoords),
                    indices: this.createBuffer(mesh.indices, gl.ELEMENT_ARRAY_BUFFER),
                    numIndices: mesh.indices.length
                };
                
                this.meshes.set(name, meshData);
                
                if (this.settings.debug.meshLoading) {
                    this.log(`Mesh ${name} caricata con ${mesh.vertices.length/3} vertici`);
                }
                
                return meshData;
            }
        } catch (error) {
            this.log(`Errore nel caricamento della mesh ${name}: ${error}`, true);
            throw error;
        }
    }
    
    // Creazione buffer WebGL
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
    
    // Caricamento texture
    async loadTexture(name, url) {
        const gl = this.gl;
        
        // Crea la texture
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        
        // Parametri texture
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        
        // Pixel bianco temporaneo
        gl.texImage2D(
            gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
            new Uint8Array([255, 255, 255, 255])
        );
        
        try {
            // Carica l'immagine
            const image = new Image();
            image.src = url;
            
            await new Promise((resolve, reject) => {
                image.onload = () => {
                    gl.bindTexture(gl.TEXTURE_2D, texture);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
                    gl.generateMipmap(gl.TEXTURE_2D);
                    resolve();
                };
                image.onerror = () => reject(new Error(`Errore nel caricamento della texture ${url}`));
            });
            
            // Memorizza la texture
            this.textures.set(name, texture);
            this.log(`Texture ${name} caricata`);
            
            return texture;
        } catch (error) {
            this.log(`Errore nel caricamento della texture ${name}: ${error}`, true);
            throw error;
        }
    }
    
    // Aggiorna posizione e orientamento camera
    updateCamera(position, target, up) {
        this.camera.position = position;
        this.camera.target = target;
        this.camera.up = up;
    }
    
    // Ottiene la matrice di vista della camera
    getCameraViewMatrix() {
        return m4.lookAt(
            this.camera.position,
            this.camera.target,
            this.camera.up
        );
    }
    
    // Ottiene la matrice di proiezione della camera
    getCameraProjectionMatrix() {
        const aspect = this.gl.canvas.clientWidth / this.gl.canvas.clientHeight;
        return m4.perspective(
            this.camera.fov,
            aspect,
            this.camera.near,
            this.camera.far
        );
    }
    
    // Ottiene la matrice di vista-proiezione per shadow mapping
    getLightSpaceMatrix() {
        // Vista dalla luce
        const lightView = m4.lookAt(
            this.light.position,
            [0, 0, 0],
            [0, 1, 0]
        );
        
        // Proiezione ortografica per shadow map
        const lightProjection = m4.ortho(
            -20, 20,
            -20, 20,
            -20, 40
        );
        
        // Combina le matrici
        return m4.multiply(lightProjection, lightView);
    }
    
    // Rendering principale
    render(scene) {
        const gl = this.gl;
        
        // Aggiorna la scena interna
        if (scene) {
            this.scene = scene;
        }
        
        // Prima pass: shadow mapping
        if (this.settings.shadows) {
            this.renderShadowMap(this.scene);
        }
        
        // Seconda pass: rendering principale
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0.1, 0.1, 0.1, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        // Usa il programma principale
        const program = this.programs.get('main');
        gl.useProgram(program);
        
        // Imposta le uniform
        this.setMainProgramUniforms(program);
        
        // Rendering di tutti gli oggetti
        if (this.scene.objects && this.scene.objects instanceof Map) {
            this.scene.objects.forEach((object, key) => {
                if (object.mesh && object.texture) {
                    this.renderObject(object, program);
                }
            });
        }
    }
    
    // Rendering della shadow map
    renderShadowMap(scene) {
        const gl = this.gl;
        
        // Prepara il framebuffer per shadow mapping
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFramebuffer);
        gl.viewport(0, 0, 1024, 1024);
        gl.clear(gl.DEPTH_BUFFER_BIT);
        
        // Usa il programma per shadow
        const program = this.programs.get('shadow');
        gl.useProgram(program);
        
        // Matrice di trasformazione per lo spazio della luce
        const lightSpaceMatrix = this.getLightSpaceMatrix();
        gl.uniformMatrix4fv(
            gl.getUniformLocation(program, 'uLightSpaceMatrix'),
            false,
            lightSpaceMatrix
        );
        
        // Rendering degli oggetti per la shadow map
        if (scene.objects && scene.objects instanceof Map) {
            scene.objects.forEach((object, key) => {
                if (object.mesh) {
                    this.renderObjectShadow(object, program);
                }
            });
        }
        
        // Torna al framebuffer default
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    
    // Imposta le uniform per il programma principale
    setMainProgramUniforms(program) {
        const gl = this.gl;
        
        try {
            // Matrici di base
            const viewMatrix = this.getCameraViewMatrix();
            const projectionMatrix = this.getCameraProjectionMatrix();
            const modelMatrix = m4.identity();
            const normalMatrix = m4.transpose(m4.inverse(modelMatrix));
            const lightSpaceMatrix = this.getLightSpaceMatrix();
            
            // Imposta le matrici
            gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uViewMatrix'), false, viewMatrix);
            gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uProjectionMatrix'), false, projectionMatrix);
            gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uModelMatrix'), false, modelMatrix);
            gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uNormalMatrix'), false, normalMatrix);
            gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uLightSpaceMatrix'), false, lightSpaceMatrix);
            
            // Luce principale
            gl.uniform3fv(gl.getUniformLocation(program, 'uLightPosition'), new Float32Array(this.light.position));
            gl.uniform3fv(gl.getUniformLocation(program, 'uLightColor'), new Float32Array(this.light.color));
            gl.uniform1f(gl.getUniformLocation(program, 'uLightIntensity'), 
                         this.light.intensity * (this.light.enabled ? 1.0 : 0.0));
            
            // Attenuazione luce
            gl.uniform3f(
                gl.getUniformLocation(program, 'uAttenuation'),
                this.light.attenuation.constant,
                this.light.attenuation.linear,
                this.light.attenuation.quadratic
            );
            
            // Luce ambientale
            gl.uniform3fv(gl.getUniformLocation(program, 'uAmbientColor'), new Float32Array(this.ambientLight.color));
            gl.uniform1f(gl.getUniformLocation(program, 'uAmbientIntensity'), this.ambientLight.intensity);
            gl.uniform1f(gl.getUniformLocation(program, 'uAmbientStrength'), this.ambientLight.strength);
            
            // Posizione camera e parametri materiale
            gl.uniform3fv(gl.getUniformLocation(program, 'uViewPosition'), new Float32Array(this.camera.position));
            gl.uniform1f(gl.getUniformLocation(program, 'uSpecularStrength'), 1.0);
            gl.uniform1f(gl.getUniformLocation(program, 'uShininess'), 32.0);
            
            // Flags per feature avanzate
            const shadowsLoc = gl.getUniformLocation(program, 'uShadowsEnabled');
            const reflectionsLoc = gl.getUniformLocation(program, 'uReflectionsEnabled');
            const advancedRenderingLoc = gl.getUniformLocation(program, 'uAdvancedRendering');
            
            if (shadowsLoc !== null) gl.uniform1i(shadowsLoc, this.settings.shadows ? 1 : 0);
            if (reflectionsLoc !== null) gl.uniform1i(reflectionsLoc, this.settings.reflections ? 1 : 0);
            if (advancedRenderingLoc !== null) gl.uniform1i(advancedRenderingLoc, this.settings.advancedRendering ? 1 : 0);
            
            return true;
        } catch (error) {
            this.log('Errore nell\'impostazione delle uniform: ' + error, true);
            return false;
        }
    }
    
    // Rendering di un singolo oggetto
    renderObject(object, program) {
        if (!object || !object.mesh) return;
        
        const gl = this.gl;
        const mesh = this.meshes.get(object.mesh);
        
        if (!mesh) {
            this.log(`Mesh non trovata: ${object.mesh}`, true);
            return;
        }
        
        // Doppio lato se necessario
        if (object.doubleSided) {
            gl.disable(gl.CULL_FACE);
        }
        
        // Setup degli attributi vertex
        this.setupVertexAttributes(program, mesh);
        
        // Binding texture
        if (object.texture && this.textures.has(object.texture)) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.textures.get(object.texture));
            gl.uniform1i(gl.getUniformLocation(program, 'uSampler'), 0);
        }
        
        // Binding shadow map se ombre abilitate
        if (this.settings.shadows) {
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, this.shadowTexture);
            gl.uniform1i(gl.getUniformLocation(program, 'uShadowMap'), 1);
        }
        
        // Calcola model matrix
        let modelMatrix = m4.identity();
        
        // Applica trasformazioni nell'ordine corretto: scala -> rotazione -> traslazione
        if (object.position) {
            modelMatrix = m4.translate(modelMatrix, 
                object.position[0], 
                object.position[1], 
                object.position[2]
            );
        }
        
        if (object.rotation) {
            modelMatrix = m4.rotateX(modelMatrix, object.rotation[0]);
            modelMatrix = m4.rotateY(modelMatrix, object.rotation[1]);
            modelMatrix = m4.rotateZ(modelMatrix, object.rotation[2]);
        }
        
        if (object.scale) {
            modelMatrix = m4.scale(modelMatrix, 
                object.scale[0], 
                object.scale[1], 
                object.scale[2]
            );
        }
        
        // Imposta model matrix
        gl.uniformMatrix4fv(
            gl.getUniformLocation(program, 'uModelMatrix'),
            false,
            modelMatrix
        );
        
        // Calcola e imposta normal matrix
        const normalMatrix = m4.transpose(m4.inverse(modelMatrix));
        gl.uniformMatrix4fv(
            gl.getUniformLocation(program, 'uNormalMatrix'),
            false,
            normalMatrix
        );
        
        // Rendering
        gl.drawElements(gl.TRIANGLES, mesh.numIndices, gl.UNSIGNED_SHORT, 0);
        
        // Ripristina culling se è stato disabilitato
        if (object.doubleSided) {
            gl.enable(gl.CULL_FACE);
        }
    }
    
    // Rendering di un oggetto per shadow mapping
    renderObjectShadow(object, program) {
        if (!object || !object.mesh) return;
        
        const gl = this.gl;
        const mesh = this.meshes.get(object.mesh);
        
        if (!mesh) return;
        
        // Setup degli attributi
        this.setupVertexAttributes(program, mesh);
        
        // Calcola model matrix
        let modelMatrix = m4.identity();
        
        if (object.position) {
            modelMatrix = m4.translate(modelMatrix, 
                object.position[0], 
                object.position[1], 
                object.position[2]
            );
        }
        
        if (object.rotation) {
            modelMatrix = m4.rotateX(modelMatrix, object.rotation[0]);
            modelMatrix = m4.rotateY(modelMatrix, object.rotation[1]);
            modelMatrix = m4.rotateZ(modelMatrix, object.rotation[2]);
        }
        
        if (object.scale) {
            modelMatrix = m4.scale(modelMatrix, 
                object.scale[0], 
                object.scale[1], 
                object.scale[2]
            );
        }
        
        // Imposta model matrix
        gl.uniformMatrix4fv(
            gl.getUniformLocation(program, 'uModelMatrix'),
            false,
            modelMatrix
        );
        
        // Rendering
        gl.drawElements(gl.TRIANGLES, mesh.numIndices, gl.UNSIGNED_SHORT, 0);
    }
    
    // Configurazione attributi vertex
    setupVertexAttributes(program, mesh) {
        const gl = this.gl;
        
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
        
        // Indices
        if (mesh.indices) {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indices);
        }
    }
    
    // Aggiorna FOV della camera
    updateCameraFOV(delta) {
        this.camera.fov = Math.max(
            Math.PI/180 * 30,   // Min 30 gradi
            Math.min(
                Math.PI/180 * 120,  // Max 120 gradi
                this.camera.fov + delta
            )
        );
    }
    
    // Gestione ridimensionamento finestra
    onWindowResize() {
        const gl = this.gl;
        const canvas = gl.canvas;
        
        // Imposta le dimensioni del canvas alla dimensione della finestra
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        // Aggiorna il viewport
        gl.viewport(0, 0, canvas.width, canvas.height);
        
        this.log(`Ridimensionamento canvas: ${canvas.width}x${canvas.height}`);
    }
    
    // Toggle ombre
    toggleShadows() {
        this.settings.shadows = !this.settings.shadows;
        this.log(`Ombre ${this.settings.shadows ? 'abilitate' : 'disabilitate'}`);
    }
    
    // Toggle riflessi
    toggleReflections() {
        this.settings.reflections = !this.settings.reflections;
        this.log(`Riflessi ${this.settings.reflections ? 'abilitati' : 'disabilitati'}`);
    }
    
    // Toggle rendering avanzato
    toggleAdvancedRendering() {
        this.settings.advancedRendering = !this.settings.advancedRendering;
        
        // Modifica parametri quando il rendering avanzato è attivo
        if (this.settings.advancedRendering) {
            this.light.intensity = 200;
            this.ambientLight.intensity = 0.7;
        } else {
            this.light.intensity = 150;
            this.ambientLight.intensity = 0.5;
        }
        
        this.log(`Rendering avanzato ${this.settings.advancedRendering ? 'abilitato' : 'disabilitato'}`);
    }
    
    // Imposta stato della luce
    setLightEnabled(enabled) {
        if (this.light.enabled !== enabled) {
            this.light.enabled = enabled;
            
            if (enabled) {
                // Effetto sfarfallio quando la luce viene accesa
                this.flickerLight();
            }
            
            this.log(`Luce ${enabled ? 'accesa' : 'spenta'}`);
        }
    }
    
    // Effetto sfarfallio della luce
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
    
    // Crea mesh per un piano
    createPlaneMesh() {
        // Vertici (x, y, z) per un piano di dimensione 2x2
        const vertices = new Float32Array([
            -1, 0, -1,   // Vertice in basso a sinistra
            1, 0, -1,    // Vertice in basso a destra
            1, 0, 1,     // Vertice in alto a destra
            -1, 0, 1     // Vertice in alto a sinistra
        ]);
        
        // Normali (tutte verso l'alto)
        const normals = new Float32Array([
            0, 1, 0,
            0, 1, 0,
            0, 1, 0,
            0, 1, 0
        ]);
        
        // Coordinate texture
        const texCoords = new Float32Array([
            0, 0,  // In basso a sinistra
            1, 0,  // In basso a destra
            1, 1,  // In alto a destra
            0, 1   // In alto a sinistra
        ]);
        
        // Indici (due triangoli)
        const indices = new Uint16Array([
            0, 2, 1,  // Primo triangolo
            0, 3, 2   // Secondo triangolo
        ]);
        
        // Crea e popola i buffer
        return {
            vertices: this.createBuffer(vertices),
            normals: this.createBuffer(normals),
            texCoords: this.createBuffer(texCoords),
            indices: this.createBuffer(indices, this.gl.ELEMENT_ARRAY_BUFFER),
            numIndices: indices.length,
            doubleSided: true  // Utile per pareti/oggetti sottili
        };
    }
}

// Rendi disponibile globalmente
window.Renderer = Renderer;