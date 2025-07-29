// ============================================================================
// CASA INFESTATA - Progetto Computer Graphics A.A.2023/24
// Applicazione 3D Interattiva WebGL con Illuminazione Dinamica e Ombre
// ============================================================================

// ============================================================================
// VARIABILI GLOBALI E CONFIGURAZIONE SISTEMA OMBRE
// ============================================================================

// Cache delle risorse per evitare ricaricamenti
const resourceCache = new Map();
let resourcesLoaded = 0;
let totalResources = 0;

// Sistema di ombre migliorato per rendering realistico
let shadowMapSize = 2048; // Risoluzione shadow map per qualità ombre
let shadowBias = 0.005; // Bias dinamico per evitare shadow acne
let shadowSamples = 16; // Numero campioni PCF per ombre morbide
let softShadows = false; // Flag per ombre morbide avanzate

// ============================================================================
// FUNZIONI DI AGGIORNAMENTO CAMERA E CONTROLLI
// ============================================================================

/**
 * Funzione principale per l'aggiornamento della camera
 * Gestisce movimento WASD, modalità spettatore e collisioni
 * @param {number} dt - Delta time per frame rate indipendente
 */
function updateCamera(dt) {
    // Salta aggiornamento se pannello aperto o gioco non iniziato
    if (isPanelOpen || !gameStarted) return;

    // Calcolo velocità basata su frame rate per movimento fluido
    const speed = playerSpeed * (dt || 0.016) * 60;

    // Reset velocità per nuovo frame
    playerVelocity[0] = 0;
    playerVelocity[2] = 0;

    // Calcola vettori direzione basati solo su yaw (rotazione orizzontale)
    const yaw = camera.rotation[1];
    
    // Vettore forward basato solo sulla rotazione orizzontale
    const forward = [
        Math.sin(yaw),
        0,
        -Math.cos(yaw)
    ];
    
    // Vettore right perpendicolare a forward
    const right = [
        Math.cos(yaw),
        0,
        Math.sin(yaw)
    ];

    // Gestione input movimento (standard WASD)
    if (keys['KeyW']) {
        playerVelocity[0] += forward[0] * speed;
        playerVelocity[2] += forward[2] * speed;
    }
    if (keys['KeyS']) {
        playerVelocity[0] -= forward[0] * speed;
        playerVelocity[2] -= forward[2] * speed;
    }
    if (keys['KeyA']) {
        playerVelocity[0] -= right[0] * speed;
        playerVelocity[2] -= right[2] * speed;
    }
    if (keys['KeyD']) {
        playerVelocity[0] += right[0] * speed;
        playerVelocity[2] += right[2] * speed;
    }

    // Modalità spettatore: movimento verticale libero (Q/E)
    if (isSpectatorMode) {
        if (keys['KeyQ']) {
            playerVelocity[1] = -speed; // Scendi (Y aumenta)
        } else if (keys['KeyE']) {
            playerVelocity[1] = speed; // Sali (Y diminuisce)
        } else {
            playerVelocity[1] = 0;
        }
    }

    // Applica movimento alla posizione camera
    camera.position[0] += playerVelocity[0];
    camera.position[1] += playerVelocity[1];
    camera.position[2] += playerVelocity[2];

    // Sistema di collisioni con le pareti della stanza
    checkWallCollisions();
}

/**
 * Sistema di collision detection AABB per limitare movimento
 * Previene che il giocatore esca dai confini della stanza
 */
function checkWallCollisions() {
    // Modalità spettatore ignora le collisioni
    if (isSpectatorMode) return;

    // FIX: Raggio giocatore aumentato per evitare di andare troppo vicino ai muri
    const playerRadius = 0.8; // Aumentato da 0.5 a 0.8

    // Calcolo limiti stanza con raggio giocatore
    const minX = -roomSize + playerRadius;
    const maxX = roomSize - playerRadius;
    const minZ = -roomSize + playerRadius;
    const maxZ = roomSize - playerRadius;

    // Limiti verticali con Y INVERTITO
    const minY = -roomHeight + 0.5; // Soffitto (Y = -5)
    const maxY = -0.5; // Vicino al pavimento (Y = 0)

    // Collisioni asse X (pareti laterali)
    if (camera.position[0] < minX) {
        camera.position[0] = minX;
        playerVelocity[0] = 0;
    } else if (camera.position[0] > maxX) {
        camera.position[0] = maxX;
        playerVelocity[0] = 0;
    }

    // Collisioni asse Z (pareti frontali/posteriori)
    if (camera.position[2] < minZ) {
        camera.position[2] = minZ;
        playerVelocity[2] = 0;
    } else if (camera.position[2] > maxZ) {
        camera.position[2] = maxZ;
        playerVelocity[2] = 0;
    }

    // Collisioni asse Y
    if (camera.position[1] < minY) {
        camera.position[1] = minY;
        playerVelocity[1] = 0;
    }
    if (camera.position[1] > maxY) {
        camera.position[1] = maxY;
        playerVelocity[1] = 0;
        playerOnFloor = true;
    }
}

/**
 * Gestione movimento mouse per controllo camera FPS
 * Implementa sensibilità costante e limiti pitch
 */
function handleMouseMove(e) {
    if (!mouseLocked || isPanelOpen) return;

    // Sensibilità calibrata per controllo preciso
    const sensitivity = 0.002;

    // Rotazione orizzontale (yaw) - movimento X mouse
    camera.rotation[1] += e.movementX * sensitivity;

    // Rotazione verticale (pitch) - movimento Y mouse
    camera.rotation[0] += e.movementY * sensitivity;

    // Limita pitch per evitare gimbal lock
    camera.rotation[0] = Math.max(-Math.PI / 2 + 0.1,
        Math.min(Math.PI / 2 - 0.1, camera.rotation[0]));
}

/**
 * Creazione matrice vista per rendering 3D
 * Usa un sistema FPS standard con rotazione prima della traslazione
 */
function createViewMatrix() {
    // Crea matrice identità
    let viewMatrix = m4.identity();
    
    // Prima applica le rotazioni (nell'ordine corretto per FPS)
    viewMatrix = m4.xRotate(viewMatrix, camera.rotation[0]); // Pitch
    viewMatrix = m4.yRotate(viewMatrix, camera.rotation[1]); // Yaw
    
    // Poi trasla nella posizione opposta della camera
    viewMatrix = m4.translate(viewMatrix, 
        -camera.position[0], 
        -camera.position[1], 
        -camera.position[2]
    );
    
    return viewMatrix;
}

// Funzione per verificare e riparare l'elemento instructions
function ensureInstructionsExist() {
    const instructions = document.getElementById('instructions');

    if (!instructions) {
        // Se l'elemento non esiste affatto, crealo da zero
        logger.log("ERRORE: Elemento instructions non trovato, verrà creato");

        const newInstructions = document.createElement('div');
        newInstructions.id = 'instructions';
        newInstructions.innerHTML = 'Premi <span style="color:#ff4d4d">F</span> per accendere la luce';
        newInstructions.style.visibility = 'hidden';
        newInstructions.style.position = 'absolute';
        newInstructions.style.bottom = '20px';
        newInstructions.style.left = '50%';
        newInstructions.style.transform = 'translateX(-50%)';
        newInstructions.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        newInstructions.style.color = 'white';
        newInstructions.style.padding = '10px';
        newInstructions.style.borderRadius = '5px';
        newInstructions.style.zIndex = '100';
        newInstructions.style.textAlign = 'center';
        newInstructions.style.fontWeight = 'bold';
        document.body.appendChild(newInstructions);

        return newInstructions;
    } else {
        // Se l'elemento esiste ma potrebbe avere problemi di stile, aggiorna comunque
        instructions.style.position = 'absolute';
        instructions.style.bottom = '20px';
        instructions.style.left = '50%';
        instructions.style.transform = 'translateX(-50%)';
        instructions.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        instructions.style.color = 'white';
        instructions.style.padding = '10px';
        instructions.style.borderRadius = '5px';
        instructions.style.zIndex = '100';
        instructions.style.textAlign = 'center';
        instructions.style.fontWeight = 'bold';

        return instructions;
    }
}

// Funzione per mostrare le coordinate della camera
function updateCameraCoordinates() {
    // Se non è attivata la visualizzazione delle coordinate, esci
    if (!showCameraCoordinates) return;

    // Crea o ottieni l'elemento per le coordinate
    let coordElement = document.getElementById('camera-coords');
    if (!coordElement) {
        coordElement = document.createElement('div');
        coordElement.id = 'camera-coords';
        document.body.appendChild(coordElement);
    }

    // Formatta le coordinate con 2 decimali
    const x = camera.position[0].toFixed(2);
    const y = camera.position[1].toFixed(2);
    const z = camera.position[2].toFixed(2);

    const rotX = (camera.rotation[0] * (180 / Math.PI)).toFixed(1);
    const rotY = (camera.rotation[1] * (180 / Math.PI)).toFixed(1);

    // Aggiungi informazioni sulla modalità spettatore
    const modeText = isSpectatorMode ? "[SPETTATORE]" : "";

    coordElement.textContent = `${modeText} Camera: X=${x} Y=${y} Z=${z} | Rotation: ${rotY}° ${rotX}°`;
    coordElement.style.display = 'block';
}

// Controlla la vicinanza alla bambola
function checkDollProximity() {
    // Calcola distanza tra giocatore e bambola
    const dx = camera.position[0] - dollPosition[0];
    const dy = camera.position[1] - dollPosition[1];
    const dz = camera.position[2] - dollPosition[2];
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Se è vicino e la luce è spenta, attiva suono
    const proximityRadius = 5;
    if (distance < proximityRadius && !isLightOn) {
        if (!sounds.laLaLa.playing && !sounds.demonLaugh.playing) {
            const randomSound = Math.random() < 0.5 ? sounds.laLaLa : sounds.demonLaugh;
            randomSound.play();
            randomSound.playing = true;

            randomSound.onended = () => {
                randomSound.playing = false;
            };
        }
    }
}

// Richiedi pointer lock
function requestPointerLock() {
    canvas.requestPointerLock = canvas.requestPointerLock ||
        canvas.mozRequestPointerLock ||
        canvas.webkitRequestPointerLock;
    canvas.requestPointerLock();
}

// Gestisci cambio stato pointer lock
function handlePointerLockChange() {
    mouseLocked = document.pointerLockElement === canvas ||
        document.mozPointerLockElement === canvas ||
        document.webkitPointerLockElement === canvas;
}

// Variabili per touch controls
let touchStartX = 0;
let touchStartY = 0;

// Gestisci inizio touch
function handleTouchStart(e) {
    e.preventDefault();

    if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }
}

// Gestisci movimento touch
function handleTouchMove(e) {
    e.preventDefault();

    if (e.touches.length === 1) {
        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;

        // Ruota camera
        const sensitivity = 0.005;
        camera.rotation[1] -= (touchX - touchStartX) * sensitivity;
        camera.rotation[0] += (touchY - touchStartY) * sensitivity;

        // Limita pitch
        camera.rotation[0] = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation[0]));

        touchStartX = touchX;
        touchStartY = touchY;
    }
}

// Gestisci fine touch
function handleTouchEnd(e) {
    e.preventDefault();
}

// Render scene
function render() {
    // Controllo errori WebGL solo occasionalmente
    if (frameCount % 30 === 0) {
        const glError = gl.getError();
        if (glError !== gl.NO_ERROR && glError !== gl.CONTEXT_LOST_WEBGL) {
            if (renderOptions.shadows) {
                renderOptions.shadows = false;
                logger.log('Ombre disabilitate a causa di errori WebGL');
            }
        }
    }

    // Clear canvas con colore più scuro per contrasto migliore
    gl.clearColor(0.05, 0.05, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (!gameStarted) return;

    // Abilita depth testing con configurazione ottimizzata per le ombre
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    // Renderizza shadow map OGNI frame quando le ombre sono attive
    if (renderOptions.shadows && isLightOn && shadowFramebuffer) {
        renderShadowMap();
    }

    // Crea matrici vista e proiezione
    const viewMatrix = createViewMatrix();
    const aspect = canvas.width / canvas.height;
    const fov = Math.PI / 2;
    
    // Near plane più vicino per evitare clipping
    // distanza minima dalla camera oltre la quale gli oggetti sono visibili
    const projectionMatrix = m4.perspective(fov, aspect, 0.05, 1000);

    renderSkybox(viewMatrix, projectionMatrix);

    // Usa il programma principale per la scena
    gl.useProgram(program);

    if (!program) {
        logger.log("ERRORE: Programma shader non valido");
        return;
    }

    // CACHING UNIFORM LOCATIONS (creato solo una volta)
    if (!gl.cachedUniforms) {
        logger.log('Creazione cache uniform locations (una volta sola)');
        gl.cachedUniforms = {
            u_model: gl.getUniformLocation(program, 'u_model'),
            u_view: gl.getUniformLocation(program, 'u_view'),
            u_projection: gl.getUniformLocation(program, 'u_projection'),
            u_lightPos: gl.getUniformLocation(program, 'u_lightPos'),
            u_viewPos: gl.getUniformLocation(program, 'u_viewPos'),
            u_useTexture: gl.getUniformLocation(program, 'u_useTexture'),
            u_texture: gl.getUniformLocation(program, 'u_texture'),
            u_isEmissive: gl.getUniformLocation(program, 'u_isEmissive'),
            u_normalMatrix: gl.getUniformLocation(program, 'u_normalMatrix'),
            u_lightSpaceMatrix: gl.getUniformLocation(program, 'u_lightSpaceMatrix'),
            u_resolution: gl.getUniformLocation(program, 'u_resolution'),
            u_lightIntensity: gl.getUniformLocation(program, 'u_lightIntensity'),
            u_shadows: gl.getUniformLocation(program, 'u_shadows'),
            u_reflections: gl.getUniformLocation(program, 'u_reflections'),
            u_lightOn: gl.getUniformLocation(program, 'u_lightOn'),
            u_externalLightOn: gl.getUniformLocation(program, 'u_externalLightOn'),
            u_advancedRendering: gl.getUniformLocation(program, 'u_advancedRendering'),
            u_externalLightColor: gl.getUniformLocation(program, 'u_externalLightColor'),
            u_externalLightIntensity: gl.getUniformLocation(program, 'u_externalLightIntensity'),
            u_shadowMap: gl.getUniformLocation(program, 'u_shadowMap')
        };
    }

    // USA LE UNIFORM CACHED (molto più veloce)
    const uniforms = gl.cachedUniforms;

    // Configura uniforms per le ombre migliorate
    setupImprovedShadowUniforms();

    // Effetto vignette horror
    gl.uniform2f(uniforms.u_resolution, canvas.width, canvas.height);

    const lightIntensity = isLightOn ? 2.0 : 0.0;
    gl.uniform1f(uniforms.u_lightIntensity, lightIntensity);

    // Opzioni di rendering - FORZA le ombre quando attive
    gl.uniform1i(uniforms.u_shadows, renderOptions.shadows && isLightOn ? 1 : 0);
    gl.uniform1i(uniforms.u_reflections, renderOptions.reflections);
    gl.uniform1i(uniforms.u_lightOn, isLightOn);
    gl.uniform1i(uniforms.u_externalLightOn, isExternalLightOn);
    gl.uniform1i(uniforms.u_advancedRendering, renderOptions.advancedRendering);

    // Luce esterna più intensa
    const externalColor = isExternalLightOn ? [0.7, 0.8, 0.9] : [0.1, 0.1, 0.15];
    const externalIntensity = isExternalLightOn ? 0.2 : 0.05;
    gl.uniform3fv(uniforms.u_externalLightColor, externalColor);
    gl.uniform1f(uniforms.u_externalLightIntensity, externalIntensity);

    // Posizioni luce e camera
    gl.uniform3fv(uniforms.u_lightPos, lightPosition);
    gl.uniform3fv(uniforms.u_viewPos, camera.position);

    // Matrici
    gl.uniformMatrix4fv(uniforms.u_view, false, viewMatrix);
    gl.uniformMatrix4fv(uniforms.u_projection, false, projectionMatrix);

    // Matrice light space per le ombre
    const lightSpaceMatrix = createLightSpaceMatrix();
    gl.uniformMatrix4fv(uniforms.u_lightSpaceMatrix, false, lightSpaceMatrix);

    // Shadow map texture - SEMPRE attiva quando le ombre sono abilitate
    if (renderOptions.shadows && shadowTexture) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, shadowTexture);
        gl.uniform1i(uniforms.u_shadowMap, 1);
    }

    // Arrays per oggetti trasparenti
    const transparentObjects = [];

    // PRIORITÀ: Renderizza prima la stanza (floor, ceiling, walls) per garantire che sia illuminata
    const roomElements = ['floor', 'ceiling', 'frontWall', 'backWall', 'leftWall', 'rightWall'];

    for (const roomElement of roomElements) {
        const model = models[roomElement];
        if (model && model.vertices && model.vertices.length > 0) {
            renderModel(model, uniforms.u_model, uniforms.u_normalMatrix, uniforms.u_isEmissive,
                uniforms.u_useTexture, uniforms.u_texture);
        }
    }

    // Renderizza tutti gli altri oggetti opachi
    for (const modelName in models) {
        if (modelName === 'skybox') continue;
        if (roomElements.includes(modelName)) continue; // Già renderizzati sopra

        const model = models[modelName];
        if (!model || !model.vertices || model.vertices.length === 0) continue;

        if (model.isTransparent) {
            const dx = camera.position[0] - (model.position[0] || 0);
            const dy = camera.position[1] - (model.position[1] || 0);
            const dz = camera.position[2] - (model.position[2] || 0);
            transparentObjects.push({
                name: modelName,
                distanceToCamera: dx * dx + dy * dy + dz * dz
            });
            continue;
        }

        renderModel(model, uniforms.u_model, uniforms.u_normalMatrix, uniforms.u_isEmissive,
            uniforms.u_useTexture, uniforms.u_texture);
    }

    // Renderizza oggetti trasparenti ordinati
    renderTransparentObjects(transparentObjects, uniforms.u_model, uniforms.u_normalMatrix,
        uniforms.u_isEmissive, uniforms.u_useTexture, uniforms.u_texture);
}

// Funzione per configurare le uniforms delle ombre migliorate
function setupImprovedShadowUniforms() {
    // Bias dinamico basato sulla distanza dalla luce
    const distanceToLight = m4.length(m4.subtractVectors(camera.position, lightPosition));
    const dynamicBias = Math.max(shadowBias, shadowBias * (distanceToLight / 20.0));

    gl.uniform1f(gl.getUniformLocation(program, 'u_shadowBias'), dynamicBias);
    gl.uniform1i(gl.getUniformLocation(program, 'u_shadowSamples'), shadowSamples);
}

// Funzione per creare la matrice light space ottimizzata per le ombre degli oggetti
function createLightSpaceMatrix() {
    const lightTarget = [0, 0, 0]; // La luce guarda al centro della stanza

    // Crea view matrix dalla luce
    const lightView = m4.lookAt(lightPosition, lightTarget, [0, 0, 1]);
    
    // Dimensioni ortografiche maggiori per catturare tutti gli oggetti
    const orthoSize = 20.0; // Aumentato da 15.0 per catturare meglio gli oggetti
    const nearPlane = 0.1;
    const farPlane = 40.0; // Aumentato per catturare oggetti lontani

    const lightProjection = m4.orthographic(
        -orthoSize, orthoSize, // left, right
        -orthoSize, orthoSize, // bottom, top
        nearPlane, farPlane // near, far
    );

    const lightSpaceMatrix = m4.multiply(lightProjection, lightView);

    return lightSpaceMatrix;
}

// Variabili per la shadow map
let shadowFramebuffer = null;
let shadowTexture = null;

// Inizializza shadow map migliorata
function initShadowMap() {
    // Verifica che WebGL sia inizializzato
    if (!gl) {
        logger.log('WebGL non ancora inizializzato per shadow map');
        return;
    }

    try {
        // Crea framebuffer per shadow map
        shadowFramebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFramebuffer);

        // Crea texture per depth map - VERSIONE WebGL 1.0
        shadowTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, shadowTexture);

        // USA RGBA invece di DEPTH_COMPONENT per compatibilità WebGL 1.0
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
            shadowMapSize, shadowMapSize, 0,
            gl.RGBA, gl.UNSIGNED_BYTE, null);

        // Parametri texture ottimizzati
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // Crea depth renderbuffer
        const depthBuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, shadowMapSize, shadowMapSize);

        // Collega texture e depth buffer al framebuffer
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
            gl.TEXTURE_2D, shadowTexture, 0);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT,
            gl.RENDERBUFFER, depthBuffer);

        // Verifica completeness del framebuffer
        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (status !== gl.FRAMEBUFFER_COMPLETE) {
            logger.log(`ERRORE: Shadow framebuffer non completo - Status: ${status}`);
            // Disabilita le ombre se il framebuffer non funziona
            renderOptions.shadows = false;
            logger.log('Ombre disabilitate a causa di problemi di compatibilità');
        } else {
            logger.log(`Shadow map inizializzata: ${shadowMapSize}x${shadowMapSize}`);
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);

    } catch (error) {
        logger.log(`Errore nell'inizializzazione shadow map: ${error.message}`);
        // Disabilita le ombre in caso di errore
        renderOptions.shadows = false;
        logger.log('Ombre disabilitate a causa di errori');
    }
}

// Renderizza shadow map con TUTTI gli oggetti per vedere le ombre
function renderShadowMap() {
    if (!renderOptions.shadows || !shadowFramebuffer || !shadowProgram) {
        return;
    }

    try {
        gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFramebuffer);

        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            logger.log('Shadow framebuffer non valido');
            renderOptions.shadows = false;
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            return;
        }

        gl.viewport(0, 0, shadowMapSize, shadowMapSize);
        gl.clearColor(1.0, 1.0, 1.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);

        gl.useProgram(shadowProgram);

        const lightSpaceMatrix = createLightSpaceMatrix();
        const u_lightSpaceMatrixLoc = gl.getUniformLocation(shadowProgram, 'u_lightSpaceMatrix');
        const u_modelLoc = gl.getUniformLocation(shadowProgram, 'u_model');

        if (u_lightSpaceMatrixLoc && u_modelLoc) {
            gl.uniformMatrix4fv(u_lightSpaceMatrixLoc, false, lightSpaceMatrix);

            let objectsRendered = 0;
            const shadowCasters = [
                'skull_0', 'skull_1', 'skull_2', 'skull_3', 'skull_4',
                'doll', 'chair', 'chair_2', 'wheelie', 'clock', 'lamp'
            ];

            for (const modelName of shadowCasters) {
                if (models[modelName] && models[modelName].vertices && models[modelName].vertices.length > 0) {
                    const model = models[modelName];
                    
                    let modelMatrix = m4.identity();

                    if (model.position) {
                        modelMatrix = m4.translate(modelMatrix,
                            model.position[0], model.position[1], model.position[2]);
                    }
                    if (model.rotation) {
                        modelMatrix = m4.xRotate(modelMatrix, model.rotation[0]);
                        modelMatrix = m4.yRotate(modelMatrix, model.rotation[1]);
                        modelMatrix = m4.zRotate(modelMatrix, model.rotation[2]);
                    }
                    if (model.scale) {
                        modelMatrix = m4.scale(modelMatrix,
                            model.scale[0], model.scale[1], model.scale[2]);
                    }

                    gl.uniformMatrix4fv(u_modelLoc, false, modelMatrix);

                    try {
                        setBuffersForShadowModel(model);
                        gl.drawArrays(gl.TRIANGLES, 0, model.vertices.length / 3);
                        objectsRendered++;
                    } catch (drawError) {
                        // Silently continue on error
                    }
                }
            }

            // Log ridotto - solo ogni 5 secondi
            if (frameCount % 300 === 0) {
                logger.log(`Shadow map: ${objectsRendered} oggetti renderizzati`);
            }
        }

    } catch (error) {
        logger.log(`Errore shadow map: ${error.message}`);
        renderOptions.shadows = false;
    } finally {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
}

// Configura buffer per shadow rendering
function setBuffersForShadowModel(model) {
    const positionLoc = gl.getAttribLocation(shadowProgram, 'a_position');

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.vertices), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
}

// Funzione per renderizzare un singolo modello
function renderModel(model, u_modelLoc, u_normalMatrixLoc, u_isEmissiveLoc, u_useTextureLoc, u_textureLoc) {
    // Verifica che il modello sia valido
    if (!model || !model.vertices || model.vertices.length === 0) {
        return;
    }

    // Crea matrice modello
    let modelMatrix = m4.identity();

    // Applica trasformazioni del modello
    if (model.position) {
        modelMatrix = m4.translate(modelMatrix,
            model.position[0],
            model.position[1],
            model.position[2]);
    }

    if (model.rotation) {
        modelMatrix = m4.xRotate(modelMatrix, model.rotation[0]);
        modelMatrix = m4.yRotate(modelMatrix, model.rotation[1]);
        modelMatrix = m4.zRotate(modelMatrix, model.rotation[2]);
    }

    if (model.scale) {
        modelMatrix = m4.scale(modelMatrix,
            model.scale[0],
            model.scale[1],
            model.scale[2]);
    }

    // Calcola matrice normale
    const normalMatrix = m4.transpose(m4.inverse(modelMatrix));

    // Imposta le uniform
    gl.uniformMatrix4fv(u_modelLoc, false, modelMatrix);
    gl.uniformMatrix4fv(u_normalMatrixLoc, false, normalMatrix);

    // Flag emissivo
    const isEmissive = model.isEmissive || false;
    gl.uniform1i(u_isEmissiveLoc, isEmissive);

    // Gestione texture
    if (model.texture && textures[model.texture]) {
        gl.uniform1i(u_useTextureLoc, true);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textures[model.texture]);
        gl.uniform1i(u_textureLoc, 0);
    } else {
        gl.uniform1i(u_useTextureLoc, false);
    }

    // Configura i buffer del modello
    setBuffersForModel(model);

    // Disegna il modello
    gl.drawArrays(gl.TRIANGLES, 0, model.vertices.length / 3);
}

// Funzione per renderizzare oggetti trasparenti ordinati per profondità
function renderTransparentObjects(transparentObjects, u_modelLoc, u_normalMatrixLoc, u_isEmissiveLoc, u_useTextureLoc, u_textureLoc) {
    // Ordina gli oggetti trasparenti per distanza (dal più lontano al più vicino)
    transparentObjects.sort((a, b) => b.distanceToCamera - a.distanceToCamera);

    // Abilita blending per trasparenza
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Disabilita depth write ma mantieni depth test
    gl.depthMask(false);

    // Renderizza oggetti trasparenti ordinati
    for (const obj of transparentObjects) {
        const model = models[obj.name];
        if (model) {
            renderModel(model, u_modelLoc, u_normalMatrixLoc, u_isEmissiveLoc, u_useTextureLoc, u_textureLoc);
        }
    }

    // Ripristina stato WebGL
    gl.disable(gl.BLEND);
    gl.depthMask(true);
}

// Funzione per creare un materiale vetro reale (senza usare wall texture)
function createGlassMaterial() {
    // Elimina la texture esistente se presente
    if (textures['glassMaterial']) {
        gl.deleteTexture(textures['glassMaterial']);
    }

    // Crea un canvas per la texture
    const glassCanvas = document.createElement('canvas');
    glassCanvas.width = 128;
    glassCanvas.height = 128;
    const ctx = glassCanvas.getContext('2d');

    // Crea un canvas vuoto (completamente trasparente)
    ctx.clearRect(0, 0, 128, 128);

    // Aggiungi un colore azzurro MOLTO leggero e trasparente
    ctx.fillStyle = 'rgba(170, 200, 255, 0.15)';
    ctx.fillRect(0, 0, 128, 128);

    // Aggiungi alcune variazioni per dare un'impressione di vetro
    for (let i = 0; i < 20; i++) {
        // Riflessi casuali
        const x = Math.random() * 128;
        const y = Math.random() * 128;
        const size = Math.random() * 5 + 1;
        const alpha = Math.random() * 0.03 + 0.02; // Molto trasparente

        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }

    // Crea la texture WebGL
    const glassTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, glassTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, glassCanvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.bindTexture(gl.TEXTURE_2D, null);

    textures['glassMaterial'] = glassTexture;

    logger.log('Nuovo materiale vetro creato con trasparenza reale');

    return glassTexture;
}

// Funzione per renderizzare lo skybox
function renderSkybox(viewMatrix, projectionMatrix) {
    // Verifica che il programma e texture dello skybox esistano
    if (!textures['skybox'] || !models['skybox'] || !skyboxProgram) {
        return;
    }

    // Usa il programma shader per lo skybox
    gl.useProgram(skyboxProgram);

    // Disabilita depth write (per disegnare lo skybox dietro tutto)
    gl.depthFunc(gl.LEQUAL);

    // Crea una versione della view matrix senza traslazione (solo rotazione)
    const skyboxViewMatrix = m4.copy(viewMatrix);
    skyboxViewMatrix[12] = 0;
    skyboxViewMatrix[13] = 0;
    skyboxViewMatrix[14] = 0;

    // Imposta le uniform per gli shader dello skybox
    const skyboxViewLoc = gl.getUniformLocation(skyboxProgram, 'u_view');
    const skyboxProjLoc = gl.getUniformLocation(skyboxProgram, 'u_projection');
    const skyboxTexLoc = gl.getUniformLocation(skyboxProgram, 'u_skybox');
    const skyboxLightOnLoc = gl.getUniformLocation(skyboxProgram, 'u_externalLightOn');

    gl.uniformMatrix4fv(skyboxViewLoc, false, skyboxViewMatrix);
    gl.uniformMatrix4fv(skyboxProjLoc, false, projectionMatrix);
    gl.uniform1i(skyboxTexLoc, 0);
    gl.uniform1i(skyboxLightOnLoc, isExternalLightOn);

    // Attiva la cubemap texture dello skybox
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, textures['skybox']);

    // Configura i buffer dei vertici dello skybox
    const skyboxPositionLoc = gl.getAttribLocation(skyboxProgram, 'a_position');
    const skyboxVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, skyboxVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(models['skybox'].vertices), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(skyboxPositionLoc);
    gl.vertexAttribPointer(skyboxPositionLoc, 3, gl.FLOAT, false, 0, 0);

    // Disegna lo skybox
    gl.drawArrays(gl.TRIANGLES, 0, 36);

    // Ripristina il depth test normale
    gl.depthFunc(gl.LESS);
}

// Configura i buffer WebGL per un modello specifico
function setBuffersForModel(model) {
    // Verifica che il modello abbia vertici validi
    if (!model.vertices || model.vertices.length === 0) {
        return;
    }

    if (!model.buffersCreated) {        
        // Crea buffer permanenti per questo modello
        model.positionBuffer = gl.createBuffer();
        model.normalBuffer = gl.createBuffer();
        model.texcoordBuffer = gl.createBuffer();
        
        // Setup position buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, model.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.vertices), gl.STATIC_DRAW);
        
        // Setup normal buffer
        let normals;
        if (model.normals && model.normals.length === model.vertices.length) {
            normals = model.normals;
        } else {
            // Crea normali di default
            normals = [];
            for (let i = 0; i < model.vertices.length / 3; i++) {
                normals.push(0, 1, 0); // Normale default verso l'alto
            }
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, model.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
        
        // Setup texcoord buffer
        let texcoords;
        if (model.texcoords && model.texcoords.length === (model.vertices.length / 3) * 2) {
            texcoords = model.texcoords;
        } else {
            // Crea coordinate texture di default
            texcoords = [];
            for (let i = 0; i < model.vertices.length / 3; i++) {
                texcoords.push(0, 0); // Coordinate UV di default
            }
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, model.texcoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoords), gl.STATIC_DRAW);
        
        // Marca come creato
        model.buffersCreated = true;
    }

    // Ottieni le locazioni degli attributi dello shader
    const positionLoc = gl.getAttribLocation(program, 'a_position');
    const normalLoc = gl.getAttribLocation(program, 'a_normal');
    const texcoordLoc = gl.getAttribLocation(program, 'a_texcoord');

    // Usa buffer position cached
    gl.bindBuffer(gl.ARRAY_BUFFER, model.positionBuffer);
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);

    // Usa buffer normal cached
    gl.bindBuffer(gl.ARRAY_BUFFER, model.normalBuffer);
    gl.enableVertexAttribArray(normalLoc);
    gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);

    // Usa buffer texcoord cached
    gl.bindBuffer(gl.ARRAY_BUFFER, model.texcoordBuffer);
    gl.enableVertexAttribArray(texcoordLoc);
    gl.vertexAttribPointer(texcoordLoc, 2, gl.FLOAT, false, 0, 0);
}

// Funzione per ottenere il vettore "avanti" dalla rotazione della camera
function getForwardVector() {
    const direction = [0, 0, 0];

    // Calcola la direzione avanti usando solo la rotazione orizzontale (yaw)
    direction[0] = Math.sin(camera.rotation[1]);
    direction[1] = 0; // Componente Y sempre 0 per il movimento orizzontale
    direction[2] = Math.cos(camera.rotation[1]);

    // Normalizza il vettore
    const length = Math.sqrt(direction[0] * direction[0] + direction[2] * direction[2]);
    if (length > 0) {
        direction[0] /= length;
        direction[2] /= length;
    }

    return direction;
}

// Funzione per ottenere il vettore "laterale" dalla rotazione della camera
function getSideVector() {
    // Il vettore laterale è perpendicolare al vettore avanti sul piano orizzontale
    const direction = [0, 0, 0];

    // Ruota il vettore avanti di 90 gradi attorno all'asse Y
    direction[0] = Math.cos(camera.rotation[1]);
    direction[1] = 0;
    direction[2] = -Math.sin(camera.rotation[1]);

    return direction;
}

function updateCrosshair() {
    const correctSwitchPosition = [9.99, -2, 0];

    // Reset dello stato
    isNearSwitch = false;

    // Calcola distanza dal giocatore all'interruttore
    const dx = camera.position[0] - correctSwitchPosition[0];
    const dy = camera.position[1] - correctSwitchPosition[1];
    const dz = camera.position[2] - correctSwitchPosition[2];
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Vicino all'interruttore?
    if (distance < 4.0) {
        // Mostra le istruzioni
        const instructions = document.getElementById('instructions');
        if (instructions) {
            instructions.style.visibility = 'visible';
            instructions.innerHTML = 'Premi <span style="color:#ff4d4d">F</span> per accendere la luce';
            isNearSwitch = true;
        }

        // Cambia il crosshair
        document.getElementById('crosshair').style.backgroundImage = "url('images/crosshair-selection.png')";
    } else {
        // Nascondi le istruzioni
        const instructions = document.getElementById('instructions');
        if (instructions) {
            instructions.style.visibility = 'hidden';
        }

        // Reimposta il crosshair
        document.getElementById('crosshair').style.backgroundImage = "url('images/crosshair.png')";
    }

    // Aggiorna la posizione globale
    switchPosition = correctSwitchPosition;
}

// Controlla la vicinanza alla bambola e attiva effetti sonori quando il giocatore è vicino
function checkDollProximity() {
    // Calcola distanza tra giocatore e bambola
    const dx = camera.position[0] - dollPosition[0];
    const dy = camera.position[1] - dollPosition[1];
    const dz = camera.position[2] - dollPosition[2];
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Se è vicino e la luce è spenta, attiva suono
    const proximityRadius = 5;
    if (distance < proximityRadius && !isLightOn) {
        // Verifica che non ci siano già suoni in riproduzione
        if (!sounds.laLaLa.playing && !sounds.demonLaugh.playing) {
            // Sceglie casualmente tra i due suoni disponibili
            const randomSound = Math.random() < 0.5 ? sounds.laLaLa : sounds.demonLaugh;
            randomSound.play();
            randomSound.playing = true;

            // Ripristina lo stato 'playing' quando il suono termina
            randomSound.onended = () => {
                randomSound.playing = false;
            };

            logger.log('Suono bambola attivato dalla vicinanza');
        }
    }
}

// Crea una stanza semplice con aperture per le finestre
function createSimpleRoom() {
    logger.log("Creazione stanza con illuminazione corretta...");

    // Definisci le dimensioni delle finestre
    const windowWidth = 4;
    const windowHeight = 2.5;
    const frameWidth = 0.2;

    // Pavimento (a Y=0) - CORREZIONE NORMALI
    models['floor'] = {
        vertices: [
            -roomSize, 0, -roomSize,
            roomSize, 0, roomSize,
            roomSize, 0, -roomSize,
            -roomSize, 0, -roomSize,
            -roomSize, 0, roomSize,
            roomSize, 0, roomSize
        ],
        normals: [
            0, 1, 0, 0, 1, 0, 0, 1, 0,
            0, 1, 0, 0, 1, 0, 0, 1, 0
        ],
        texcoords: [
            0, 0, 2, 2, 2, 0,
            0, 0, 0, 2, 2, 2
        ],
        position: [0, -5, 0],
        scale: [1, 1, 1],
        texture: 'floor'
    };

    // Soffitto (a Y=-roomHeight) - CORREZIONE NORMALI
    models['ceiling'] = {
        vertices: [
            -roomSize, -roomHeight, -roomSize,
            roomSize, -roomHeight, roomSize,
            roomSize, -roomHeight, -roomSize,
            -roomSize, -roomHeight, -roomSize,
            -roomSize, -roomHeight, roomSize,
            roomSize, -roomHeight, roomSize
        ],
        normals: [
            0, -1, 0, // Normale verso il basso (verso la stanza)
            0, -1, 0,
            0, -1, 0,
            0, -1, 0,
            0, -1, 0,
            0, -1, 0
        ],
        texcoords: [
            0, 0, 2, 2, 2, 0,
            0, 0, 0, 2, 2, 2
        ],
        position: [0, 5, 0],
        scale: [1, 1, 1],
        texture: 'ceiling'
    };

    // Definisci posizioni finestre
    const windowPositions = [{
            x: 0,
            y: -1.3,
            wall: 'front'
        },
        {
            x: 0,
            y: -1.3,
            wall: 'back'
        },
        {
            x: 4,
            y: -1.3,
            wall: 'right'
        },
        {
            x: -4,
            y: -1.3,
            wall: 'left'
        }
    ];

    // Crea pareti con aperture per le finestre (con normali corrette)
    createWallWithHoles('frontWall', 'front', windowPositions);
    createWallWithHoles('backWall', 'back', windowPositions);
    createWallWithHoles('leftWall', 'left', windowPositions);
    createWallWithHoles('rightWall', 'right', windowPositions);

    // Aggiungi le cornici delle finestre
    addWindowOpenings();

    // Aggiungo foto autore
    createAuthorPicture();

    logger.log('Stanza con illuminazione corretta creata');
}

function createAuthorPicture() {
    logger.log("Creazione quadro con foto dell'autore...");

    // Dimensioni del quadro
    const frameWidth = 1.5;
    const frameHeight = 2.0;
    const frameDepth = 0.05;

    // Posizione: parete frontale, sinistra della finestra centrale
    const frameX = -3.5; // Sinistra della finestra (che è a X=0)
    const frameY = -2.5; // Altezza occhi
    const frameZ = -roomSize + 0.02; // Sulla parete frontale, leggermente staccato

    // Vertici del quadro (rettangolo)
    const frameVertices = [
        // Faccia frontale del quadro
        frameX - frameWidth / 2, frameY + frameHeight / 2, frameZ,
        frameX + frameWidth / 2, frameY + frameHeight / 2, frameZ,
        frameX + frameWidth / 2, frameY - frameHeight / 2, frameZ,
        frameX - frameWidth / 2, frameY + frameHeight / 2, frameZ,
        frameX + frameWidth / 2, frameY - frameHeight / 2, frameZ,
        frameX - frameWidth / 2, frameY - frameHeight / 2, frameZ
    ];

    // Normali (tutte verso l'interno della stanza)
    const frameNormals = [
        0, 0, 1, 0, 0, 1, 0, 0, 1,
        0, 0, 1, 0, 0, 1, 0, 0, 1
    ];

    // Coordinate texture (importanti per mostrare correttamente la foto)
    const frameTexcoords = [
        0, 0, // In basso a sinistra
        1, 0, // In basso a destra  
        1, 1, // In alto a destra
        0, 0, // In basso a sinistra
        1, 1, // In alto a destra
        0, 1 // In alto a sinistra
    ];

    // Aggiungi il quadro ai modelli
    models['authorPicture'] = {
        vertices: frameVertices,
        normals: frameNormals,
        texcoords: frameTexcoords,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        texture: 'author_photo'
    };

    logger.log(`Quadro con foto dell'autore creato in posizione [${frameX}, ${frameY}, ${frameZ}]`);
}

// Funzione per creare una parete con aperture per finestre
function createWallWithHoles(wallName, wallType, windows) {
    logger.log(`Creazione parete ${wallName} con aperture...`);

    // Filtro solo le finestre per questa parete
    const windowsForThisWall = windows.filter(window => window.wall === wallType);

    // Se non ci sono finestre per questa parete, crea una parete normale
    if (windowsForThisWall.length === 0) {
        createSimpleWall(wallName, wallType);
        return;
    }

    // Altrimenti, crea una parete con aperture
    const windowWidth = 4;
    const windowHeight = 2.5;

    // Prepara gli array per vertici, normali e coordinate texture
    let vertices = [];
    let normals = [];
    let texcoords = [];

    // Determina la normale in base al tipo di parete
    let normalX = 0,
        normalY = 0,
        normalZ = 0;
    if (wallType === 'front') normalZ = 1;
    else if (wallType === 'back') normalZ = -1;
    else if (wallType === 'left') normalX = 1;
    else if (wallType === 'right') normalX = -1;

    // Per ogni finestra su questa parete
    for (const window of windowsForThisWall) {
        // Posizione Y della finestra
        const windowY = window.y;
        const windowX = window.x;

        // Calcola i limiti della finestra
        let minX, maxX, minZ, maxZ;

        if (wallType === 'front' || wallType === 'back') {
            minX = windowX - windowWidth / 2;
            maxX = windowX + windowWidth / 2;
            minZ = wallType === 'front' ? -roomSize : roomSize;
            maxZ = minZ;
            logger.log(`Apertura parete ${wallType}: x=${minX} a ${maxX}, y=${windowY}, z=${minZ}`);
        } else {
            // Per le pareti laterali, X è costante, la finestra varia in Z
            if (wallType === 'left') {
                minX = -roomSize;
                maxX = minX;
                minZ = windowX - windowWidth / 2; // NOTA: usiamo windowX per la coordinata Z
                maxZ = windowX + windowWidth / 2;
            } else { // right wall
                minX = roomSize;
                maxX = minX;
                minZ = -windowX - windowWidth / 2; // Negativo di windowX!
                maxZ = -windowX + windowWidth / 2;
            }
            logger.log(`Apertura parete ${wallType}: x=${minX}, z=${minZ} a ${maxZ}, y=${windowY}`);
        }

        // Crea la parte superiore (sopra la finestra)
        if (wallType === 'front' || wallType === 'back') {
            // Parte superiore
            vertices.push(
                -roomSize, 0, minZ,
                roomSize, 0, minZ,
                roomSize, windowY, minZ,
                -roomSize, 0, minZ,
                roomSize, windowY, minZ,
                -roomSize, windowY, minZ
            );

            // Parte sinistra (a sinistra della finestra)
            vertices.push(
                -roomSize, windowY, minZ,
                minX, windowY, minZ,
                minX, windowY - windowHeight, minZ,
                -roomSize, windowY, minZ,
                minX, windowY - windowHeight, minZ,
                -roomSize, windowY - windowHeight, minZ
            );

            // Parte destra (a destra della finestra)
            vertices.push(
                maxX, windowY, minZ,
                roomSize, windowY, minZ,
                roomSize, windowY - windowHeight, minZ,
                maxX, windowY, minZ,
                roomSize, windowY - windowHeight, minZ,
                maxX, windowY - windowHeight, minZ
            );

            // Parte inferiore (sotto la finestra)
            vertices.push(
                -roomSize, windowY - windowHeight, minZ,
                minX, windowY - windowHeight, minZ,
                maxX, windowY - windowHeight, minZ,
                -roomSize, windowY - windowHeight, minZ,
                maxX, windowY - windowHeight, minZ,
                roomSize, windowY - windowHeight, minZ,
                maxX, windowY - windowHeight, minZ,
                roomSize, windowY - windowHeight, minZ,
                roomSize, -roomHeight, minZ,
                -roomSize, windowY - windowHeight, minZ,
                maxX, windowY - windowHeight, minZ,
                -roomSize, -roomHeight, minZ,
                -roomSize, -roomHeight, minZ,
                maxX, windowY - windowHeight, minZ,
                roomSize, -roomHeight, minZ
            );
        } else {
            // Parete laterale (sinistra o destra)
            // Parte superiore
            vertices.push(
                minX, 0, -roomSize,
                minX, 0, roomSize,
                minX, windowY, roomSize,
                minX, 0, -roomSize,
                minX, windowY, roomSize,
                minX, windowY, -roomSize
            );

            // Parte frontale (davanti alla finestra)
            vertices.push(
                minX, windowY, -roomSize,
                minX, windowY, minZ,
                minX, windowY - windowHeight, minZ,
                minX, windowY, -roomSize,
                minX, windowY - windowHeight, minZ,
                minX, windowY - windowHeight, -roomSize
            );

            // Parte posteriore (dietro alla finestra)
            vertices.push(
                minX, windowY, maxZ,
                minX, windowY, roomSize,
                minX, windowY - windowHeight, roomSize,
                minX, windowY, maxZ,
                minX, windowY - windowHeight, roomSize,
                minX, windowY - windowHeight, maxZ
            );

            // Parte inferiore (sotto la finestra)
            vertices.push(
                minX, windowY - windowHeight, -roomSize,
                minX, windowY - windowHeight, minZ,
                minX, windowY - windowHeight, maxZ,
                minX, windowY - windowHeight, -roomSize,
                minX, windowY - windowHeight, maxZ,
                minX, windowY - windowHeight, roomSize,
                minX, windowY - windowHeight, roomSize,
                minX, windowY - windowHeight, maxZ,
                minX, -roomHeight, roomSize,
                minX, windowY - windowHeight, -roomSize,
                minX, windowY - windowHeight, roomSize,
                minX, -roomHeight, -roomSize,
                minX, -roomHeight, -roomSize,
                minX, -roomHeight, roomSize,
                minX, windowY - windowHeight, roomSize
            );
        }

        // Aggiungi le normali per tutti i vertici aggiunti
        for (let i = 0; i < vertices.length / 3 - normals.length; i++) {
            normals.push(normalX, normalY, normalZ);
        }
    }

    // Calcola le coordinate texture basate sulle posizioni dei vertici
    for (let i = 0; i < vertices.length; i += 3) {
        let u, v;

        if (wallType === 'front' || wallType === 'back') {
            u = (vertices[i] + roomSize) / (2 * roomSize);
            v = -vertices[i + 1] / roomHeight;
        } else {
            u = (vertices[i + 2] + roomSize) / (2 * roomSize);
            v = -vertices[i + 1] / roomHeight;
        }

        texcoords.push(u, v);
    }

    // Crea il modello della parete
    models[wallName] = {
        vertices: vertices,
        normals: normals,
        texcoords: texcoords,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        texture: 'wall'
    };

    logger.log(`Parete ${wallName} creata con aperture per finestre`);
}

// Funzione per creare una parete semplice senza aperture
function createSimpleWall(wallName, wallType) {
    let vertices, normals, texcoords;

    if (wallType === 'front') {
        vertices = [
            -roomSize, 0, -roomSize,
            roomSize, 0, -roomSize,
            roomSize, -roomHeight, -roomSize,
            -roomSize, 0, -roomSize,
            roomSize, -roomHeight, -roomSize,
            -roomSize, -roomHeight, -roomSize
        ];
        normals = [
            0, 0, 1,
            0, 0, 1,
            0, 0, 1,
            0, 0, 1,
            0, 0, 1,
            0, 0, 1
        ];
    } else if (wallType === 'back') {
        vertices = [
            -roomSize, 0, roomSize,
            roomSize, -roomHeight, roomSize,
            roomSize, 0, roomSize,
            -roomSize, 0, roomSize,
            -roomSize, -roomHeight, roomSize,
            roomSize, -roomHeight, roomSize
        ];
        normals = [
            0, 0, -1,
            0, 0, -1,
            0, 0, -1,
            0, 0, -1,
            0, 0, -1,
            0, 0, -1
        ];
    } else if (wallType === 'left') {
        vertices = [
            -roomSize, 0, -roomSize,
            -roomSize, -roomHeight, -roomSize,
            -roomSize, -roomHeight, roomSize,
            -roomSize, 0, -roomSize,
            -roomSize, -roomHeight, roomSize,
            -roomSize, 0, roomSize
        ];
        normals = [
            1, 0, 0,
            1, 0, 0,
            1, 0, 0,
            1, 0, 0,
            1, 0, 0,
            1, 0, 0
        ];
    } else if (wallType === 'right') {
        vertices = [
            roomSize, 0, -roomSize,
            roomSize, 0, roomSize,
            roomSize, -roomHeight, roomSize,
            roomSize, 0, -roomSize,
            roomSize, -roomHeight, roomSize,
            roomSize, -roomHeight, -roomSize
        ];
        normals = [
            -1, 0, 0,
            -1, 0, 0,
            -1, 0, 0,
            -1, 0, 0,
            -1, 0, 0,
            -1, 0, 0
        ];
    }

    texcoords = [
        0, 0,
        1, 0,
        1, 1,
        0, 0,
        1, 1,
        0, 1
    ];

    models[wallName] = {
        vertices: vertices,
        normals: normals,
        texcoords: texcoords,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        texture: 'wall',
        isTransparent: false
    };

    logger.log(`Parete ${wallName} creata (semplice, senza aperture)`);
}

// Funzione per creare una parete con apertura per finestra
function createWallWithWindow(name, wallType, windowY, windowWidth, windowHeight) {
    const halfWidth = windowWidth / 2;

    let vertices = [];
    let normals = [];
    let texcoords = [];
    let normalVector = [0, 0, 0];

    // Determina il vettore normale in base al tipo di parete
    switch (wallType) {
        case 'front':
            normalVector = [0, 0, 1]; // +Z
            break;
        case 'back':
            normalVector = [0, 0, -1]; // -Z
            break;
        case 'left':
            normalVector = [1, 0, 0]; // +X
            break;
        case 'right':
            normalVector = [-1, 0, 0]; // -X
            break;
    }

    // Determina le coordinate dei vertici in base al tipo di parete
    if (wallType === 'front' || wallType === 'back') {
        const z = wallType === 'front' ? -roomSize : roomSize;

        // Parte superiore (sopra la finestra)
        vertices.push(
            // Triangolo 1
            -roomSize, 0, z,
            roomSize, 0, z,
            roomSize, windowY, z,
            // Triangolo 2
            -roomSize, 0, z,
            roomSize, windowY, z,
            -roomSize, windowY, z
        );

        // Parte sinistra (a sinistra della finestra)
        vertices.push(
            // Triangolo 1
            -roomSize, windowY, z,
            -halfWidth, windowY, z,
            -halfWidth, windowY - windowHeight, z,
            // Triangolo 2
            -roomSize, windowY, z,
            -halfWidth, windowY - windowHeight, z,
            -roomSize, windowY - windowHeight, z
        );

        // Parte destra (a destra della finestra)
        vertices.push(
            // Triangolo 1
            halfWidth, windowY, z,
            roomSize, windowY, z,
            roomSize, windowY - windowHeight, z,
            // Triangolo 2
            halfWidth, windowY, z,
            roomSize, windowY - windowHeight, z,
            halfWidth, windowY - windowHeight, z
        );

        // Parte inferiore (sotto la finestra)
        vertices.push(
            // Triangolo 1
            -roomSize, windowY - windowHeight, z,
            halfWidth, windowY - windowHeight, z,
            roomSize, windowY - windowHeight, z,
            // Triangolo 2
            -roomSize, windowY - windowHeight, z,
            roomSize, windowY - windowHeight, z,
            -roomSize, -roomHeight, z,
            // Triangolo 3
            roomSize, windowY - windowHeight, z,
            roomSize, -roomHeight, z,
            -roomSize, -roomHeight, z
        );
    } else {
        // Per le pareti laterali (sinistra e destra)
        const x = wallType === 'left' ? -roomSize : roomSize;

        // Parte superiore (sopra la finestra)
        vertices.push(
            // Triangolo 1
            x, 0, -roomSize,
            x, 0, roomSize,
            x, windowY, roomSize,
            // Triangolo 2
            x, 0, -roomSize,
            x, windowY, roomSize,
            x, windowY, -roomSize
        );

        // Parte frontale (davanti alla finestra)
        vertices.push(
            // Triangolo 1
            x, windowY, -roomSize,
            x, windowY, -halfWidth,
            x, windowY - windowHeight, -halfWidth,
            // Triangolo 2
            x, windowY, -roomSize,
            x, windowY - windowHeight, -halfWidth,
            x, windowY - windowHeight, -roomSize
        );

        // Parte posteriore (dietro la finestra)
        vertices.push(
            // Triangolo 1
            x, windowY, halfWidth,
            x, windowY, roomSize,
            x, windowY - windowHeight, roomSize,
            // Triangolo 2
            x, windowY, halfWidth,
            x, windowY - windowHeight, roomSize,
            x, windowY - windowHeight, halfWidth
        );

        // Parte inferiore (sotto la finestra)
        vertices.push(
            // Triangolo 1
            x, windowY - windowHeight, -roomSize,
            x, windowY - windowHeight, halfWidth,
            x, windowY - windowHeight, roomSize,
            // Triangolo 2
            x, windowY - windowHeight, -roomSize,
            x, windowY - windowHeight, roomSize,
            x, -roomHeight, -roomSize,
            // Triangolo 3
            x, windowY - windowHeight, roomSize,
            x, -roomHeight, roomSize,
            x, -roomHeight, -roomSize
        );
    }

    // Appiattisci i vertici
    const flatVertices = [];
    for (let i = 0; i < vertices.length; i += 3) {
        flatVertices.push(vertices[i][0], vertices[i][1], vertices[i][2]);
        flatVertices.push(vertices[i + 1][0], vertices[i + 1][1], vertices[i + 1][2]);
        flatVertices.push(vertices[i + 2][0], vertices[i + 2][1], vertices[i + 2][2]);
    }

    // Crea normali e coordinate texture
    for (let i = 0; i < vertices.length; i += 3) {
        // Aggiungi normali per i tre vertici del triangolo
        for (let j = 0; j < 3; j++) {
            normals.push(normalVector[0], normalVector[1], normalVector[2]);
        }

        // Calcola coordinate texture approssimative
        const triVerts = [vertices[i], vertices[i + 1], vertices[i + 2]];

        // Normalizza le coordinate in funzione delle dimensioni della stanza
        let u1, v1, u2, v2, u3, v3;

        if (wallType === 'front' || wallType === 'back') {
            u1 = (triVerts[0][0] + roomSize) / (2 * roomSize);
            v1 = (-triVerts[0][1]) / roomHeight;
            u2 = (triVerts[1][0] + roomSize) / (2 * roomSize);
            v2 = (-triVerts[1][1]) / roomHeight;
            u3 = (triVerts[2][0] + roomSize) / (2 * roomSize);
            v3 = (-triVerts[2][1]) / roomHeight;
        } else {
            u1 = (triVerts[0][2] + roomSize) / (2 * roomSize);
            v1 = (-triVerts[0][1]) / roomHeight;
            u2 = (triVerts[1][2] + roomSize) / (2 * roomSize);
            v2 = (-triVerts[1][1]) / roomHeight;
            u3 = (triVerts[2][2] + roomSize) / (2 * roomSize);
            v3 = (-triVerts[2][1]) / roomHeight;
        }

        texcoords.push(u1, v1, u2, v2, u3, v3);
    }

    // Crea il modello della parete
    models[name] = {
        vertices: flatVertices,
        normals: normals,
        texcoords: texcoords,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        texture: 'wall'
    };
}

// Funzione migliorata per aggiungere finestre alla stanza
function addWindows() {
    // Crea texture per vetro e cornici
    const glassTexture = createGlassMaterial();

    // Crea texture per la cornice
    if (!textures['windowFrame']) {
        const frameCanvas = document.createElement('canvas');
        frameCanvas.width = 64;
        frameCanvas.height = 64;
        const frameCtx = frameCanvas.getContext('2d');

        // Colore base legno scuro
        frameCtx.fillStyle = '#3A2A1A';
        frameCtx.fillRect(0, 0, 64, 64);

        // Venature del legno
        for (let i = 0; i < 8; i++) {
            const y = i * 8;
            frameCtx.fillStyle = `rgba(80, 60, 30, 0.4)`;
            frameCtx.fillRect(0, y, 64, 3);
        }

        const frameTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, frameTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, frameCanvas);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.bindTexture(gl.TEXTURE_2D, null);
        textures['windowFrame'] = frameTexture;

        logger.log('Texture cornice finestra creata');
    }

    // Definisci le dimensioni delle finestre
    const windowWidth = 4;
    const windowHeight = 2.5;
    const frameWidth = 0.2;

    // Offset Z per evitare z-fighting
    const glassOffset = 0.01; // Offset per il vetro
    const frameOffset = 0.02; // Offset maggiore per le cornici (più avanti)

    // Definisci le posizioni delle finestre
    const windows = [{
            x: 0,
            y: 3.0,
            wall: 'front'
        }, // Finestra sulla parete frontale
        {
            x: 0,
            y: 3.0,
            wall: 'back'
        }, // Finestra sulla parete posteriore
        {
            x: 4,
            y: 3.0,
            wall: 'right'
        }, // Finestra sulla parete destra
        {
            x: -4,
            y: 3.0,
            wall: 'left'
        } // Finestra sulla parete sinistra
    ];

    logger.log(`Creazione finestre: ${windows.length}`);

    // Rimuovi vecchi modelli di finestre se esistono
    for (const key in models) {
        if (key.startsWith('window')) {
            delete models[key];
        }
    }

    // Crea le finestre
    windows.forEach((window, index) => {
        // Determina i valori di posizione basati sulla parete
        let x = window.x;
        let y = window.y;
        let z = 0;
        let rotationY = 0;
        let wallOffset = 0.05; // Offset dalla parete per evitare z-fighting

        switch (window.wall) {
            case 'front':
                z = -roomSize + wallOffset;
                logger.log(`Finestra frontale: [${x}, ${y}, ${z}]`);
                break;
            case 'back':
                z = roomSize - wallOffset;
                rotationY = Math.PI;
                logger.log(`Finestra posteriore: [${x}, ${y}, ${z}]`);
                break;
            case 'left':
                x = -roomSize + wallOffset;
                z = window.x;
                rotationY = Math.PI / 2;
                logger.log(`Finestra sinistra: [${x}, ${y}, ${z}]`);
                break;
            case 'right':
                x = roomSize - wallOffset;
                z = -window.x;
                rotationY = -Math.PI / 2;
                logger.log(`Finestra destra: [${x}, ${y}, ${z}]`);
                break;
        }

        // Vetro centrale - semplicemente un rettangolo trasparente
        models[`windowGlass_${index}`] = {
            vertices: [
                -windowWidth / 2, y, glassOffset,
                windowWidth / 2, y, glassOffset,
                windowWidth / 2, y - windowHeight, glassOffset,
                -windowWidth / 2, y, glassOffset,
                windowWidth / 2, y - windowHeight, glassOffset,
                -windowWidth / 2, y - windowHeight, glassOffset
            ],
            normals: new Array(18).fill(0), // Da impostare dopo
            texcoords: [
                0, 0,
                1, 0,
                1, 1,
                0, 0,
                1, 1,
                0, 1
            ],
            position: [x, 0, z],
            rotation: [0, rotationY, 0],
            scale: [1, 1, 1],
            texture: 'glassMaterial',
            isTransparent: true
        };

        // Impostiamo le normali in base alla direzione della parete
        for (let i = 0; i < 6; i++) {
            if (window.wall === 'front') {
                models[`windowGlass_${index}`].normals[i * 3 + 2] = 1; // Normale in direzione +Z
            } else if (window.wall === 'back') {
                models[`windowGlass_${index}`].normals[i * 3 + 2] = -1; // Normale in direzione -Z
            } else if (window.wall === 'left') {
                models[`windowGlass_${index}`].normals[i * 3] = 1; // Normale in direzione +X
            } else if (window.wall === 'right') {
                models[`windowGlass_${index}`].normals[i * 3] = -1; // Normale in direzione -X
            }
        }

        // Ora aggiungiamo le cornici

        // Cornice superiore
        models[`windowFrameTop_${index}`] = {
            vertices: [
                -windowWidth / 2 - frameWidth, y + frameWidth, frameOffset,
                windowWidth / 2 + frameWidth, y + frameWidth, frameOffset,
                windowWidth / 2 + frameWidth, y, frameOffset,
                -windowWidth / 2 - frameWidth, y + frameWidth, frameOffset,
                windowWidth / 2 + frameWidth, y, frameOffset,
                -windowWidth / 2 - frameWidth, y, frameOffset
            ],
            normals: [...models[`windowGlass_${index}`].normals], // Copiamo le normali dal vetro
            texcoords: [
                0, 0,
                1, 0,
                1, 1,
                0, 0,
                1, 1,
                0, 1
            ],
            position: [x, 0, z],
            rotation: [0, rotationY, 0],
            scale: [1, 1, 1],
            texture: 'windowFrame'
        };

        // Cornice inferiore
        models[`windowFrameBottom_${index}`] = {
            vertices: [
                -windowWidth / 2 - frameWidth, y - windowHeight, frameOffset,
                windowWidth / 2 + frameWidth, y - windowHeight, frameOffset,
                windowWidth / 2 + frameWidth, y - windowHeight - frameWidth, frameOffset,
                -windowWidth / 2 - frameWidth, y - windowHeight, frameOffset,
                windowWidth / 2 + frameWidth, y - windowHeight - frameWidth, frameOffset,
                -windowWidth / 2 - frameWidth, y - windowHeight - frameWidth, frameOffset
            ],
            normals: [...models[`windowGlass_${index}`].normals],
            texcoords: [
                0, 0,
                1, 0,
                1, 1,
                0, 0,
                1, 1,
                0, 1
            ],
            position: [x, 0, z],
            rotation: [0, rotationY, 0],
            scale: [1, 1, 1],
            texture: 'windowFrame'
        };

        // Cornice sinistra
        models[`windowFrameLeft_${index}`] = {
            vertices: [
                -windowWidth / 2 - frameWidth, y + frameWidth, frameOffset,
                -windowWidth / 2, y + frameWidth, frameOffset,
                -windowWidth / 2, y - windowHeight - frameWidth, frameOffset,
                -windowWidth / 2 - frameWidth, y + frameWidth, frameOffset,
                -windowWidth / 2, y - windowHeight - frameWidth, frameOffset,
                -windowWidth / 2 - frameWidth, y - windowHeight - frameWidth, frameOffset
            ],
            normals: [...models[`windowGlass_${index}`].normals],
            texcoords: [
                0, 0,
                1, 0,
                1, 1,
                0, 0,
                1, 1,
                0, 1
            ],
            position: [x, 0, z],
            rotation: [0, rotationY, 0],
            scale: [1, 1, 1],
            texture: 'windowFrame'
        };

        // Cornice destra
        models[`windowFrameRight_${index}`] = {
            vertices: [
                windowWidth / 2, y + frameWidth, frameOffset,
                windowWidth / 2 + frameWidth, y + frameWidth, frameOffset,
                windowWidth / 2 + frameWidth, y - windowHeight - frameWidth, frameOffset,
                windowWidth / 2, y + frameWidth, frameOffset,
                windowWidth / 2 + frameWidth, y - windowHeight - frameWidth, frameOffset,
                windowWidth / 2, y - windowHeight - frameWidth, frameOffset
            ],
            normals: [...models[`windowGlass_${index}`].normals],
            texcoords: [
                0, 0,
                1, 0,
                1, 1,
                0, 0,
                1, 1,
                0, 1
            ],
            position: [x, 0, z],
            rotation: [0, rotationY, 0],
            scale: [1, 1, 1],
            texture: 'windowFrame'
        };

        // Traversa centrale orizzontale (opzionale)
        models[`windowFrameMiddle_${index}`] = {
            vertices: [
                -windowWidth / 2, y - windowHeight / 2 + frameWidth / 2, frameOffset,
                windowWidth / 2, y - windowHeight / 2 + frameWidth / 2, frameOffset,
                windowWidth / 2, y - windowHeight / 2 - frameWidth / 2, frameOffset,
                -windowWidth / 2, y - windowHeight / 2 + frameWidth / 2, frameOffset,
                windowWidth / 2, y - windowHeight / 2 - frameWidth / 2, frameOffset,
                -windowWidth / 2, y - windowHeight / 2 - frameWidth / 2, frameOffset
            ],
            normals: [...models[`windowGlass_${index}`].normals],
            texcoords: [
                0, 0,
                1, 0,
                1, 1,
                0, 0,
                1, 1,
                0, 1
            ],
            position: [x, 0, z],
            rotation: [0, rotationY, 0],
            scale: [1, 1, 1],
            texture: 'windowFrame'
        };
    });

    logger.log('Finestre create con materiale vetro personalizzato');

    // Rimuovi eventuali texture precedenti
    if (textures['glass']) {
        gl.deleteTexture(textures['glass']);
        delete textures['glass'];
        logger.log('Texture glass.png eliminata');
    }

    // Rimuovi modelli precedenti delle vecchie finestre
    if (models['frontWindow']) {
        delete models['frontWindow'];
        logger.log('Modello frontWindow rimosso');
    }

    if (models['backWindow']) {
        delete models['backWindow'];
        logger.log('Modello backWindow rimosso');
    }
}

// Funzione alternativa: crea finestre come aperture senza vetro
function addWindowOpenings() {
    // Crea texture per la cornice
    if (!textures['windowFrame']) {
        const frameCanvas = document.createElement('canvas');
        frameCanvas.width = 64;
        frameCanvas.height = 64;
        const frameCtx = frameCanvas.getContext('2d');

        // Colore base legno scuro
        frameCtx.fillStyle = '#3A2A1A';
        frameCtx.fillRect(0, 0, 64, 64);

        // Venature del legno
        for (let i = 0; i < 8; i++) {
            const y = i * 8;
            frameCtx.fillStyle = `rgba(80, 60, 30, 0.4)`;
            frameCtx.fillRect(0, y, 64, 3);
        }

        const frameTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, frameTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, frameCanvas);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.bindTexture(gl.TEXTURE_2D, null);
        textures['windowFrame'] = frameTexture;

        logger.log('Texture cornice finestra creata');
    }

    // Definisci le dimensioni delle finestre
    const windowWidth = 4;
    const windowHeight = 2.5;
    const frameWidth = 0.2;

    // Offset Z per evitare z-fighting
    const frameOffset = 0.02;

    // Definisci le posizioni delle finestre
    const windows = [{
            x: 0,
            y: -1.3,
            wall: 'front'
        }, // Finestra sulla parete frontale
        {
            x: 0,
            y: -1.3,
            wall: 'back'
        }, // Finestra sulla parete posteriore
        {
            x: 4,
            y: -1.3,
            wall: 'right'
        }, // Finestra sulla parete destra
        {
            x: -4,
            y: -1.3,
            wall: 'left'
        } // Finestra sulla parete sinistra
    ];

    logger.log(`Creazione aperture finestre: ${windows.length}`);

    // Rimuovi vecchi modelli di finestre se esistono
    for (const key in models) {
        if (key.startsWith('window')) {
            delete models[key];
        }
    }

    // Crea le finestre (solo le cornici)
    windows.forEach((window, index) => {
        // Determina i valori di posizione basati sulla parete
        let x = window.x;
        let y = window.y;
        let z = 0;
        let rotationY = 0;
        let wallOffset = 0.05; // Offset dalla parete

        switch (window.wall) {
            case 'front':
                z = -roomSize + wallOffset;
                logger.log(`Finestra frontale: [${x}, ${y}, ${z}]`);
                break;
            case 'back':
                z = roomSize - wallOffset;
                rotationY = Math.PI;
                logger.log(`Finestra posteriore: [${x}, ${y}, ${z}]`);
                break;
            case 'left':
                x = -roomSize + wallOffset;
                z = window.x; // Importante: usiamo x come coordinata z per le pareti laterali
                rotationY = Math.PI / 2;
                logger.log(`Finestra sinistra: x=${x}, z=${z}, y=${y}, rotazione=${rotationY}`);
                break;
            case 'right':
                x = roomSize - wallOffset;
                z = -window.x; // Nota il segno negativo qui!
                rotationY = -Math.PI / 2;
                logger.log(`Finestra destra: x=${x}, z=${z}, y=${y}, rotazione=${rotationY}`);
                break;
        }

        // Crea un array di normali in base alla direzione della parete
        const normals = new Array(18).fill(0);
        for (let i = 0; i < 6; i++) {
            if (window.wall === 'front') {
                normals[i * 3 + 2] = 1; // Normale in direzione +Z
            } else if (window.wall === 'back') {
                normals[i * 3 + 2] = -1; // Normale in direzione -Z
            } else if (window.wall === 'left') {
                normals[i * 3] = 1; // Normale in direzione +X
            } else if (window.wall === 'right') {
                normals[i * 3] = -1; // Normale in direzione -X
            }
        }

        // Cornice superiore
        models[`windowFrameTop_${index}`] = {
            vertices: [
                -windowWidth / 2 - frameWidth, y + frameWidth, frameOffset,
                windowWidth / 2 + frameWidth, y + frameWidth, frameOffset,
                windowWidth / 2 + frameWidth, y, frameOffset,
                -windowWidth / 2 - frameWidth, y + frameWidth, frameOffset,
                windowWidth / 2 + frameWidth, y, frameOffset,
                -windowWidth / 2 - frameWidth, y, frameOffset
            ],
            normals: normals,
            texcoords: [
                0, 0,
                1, 0,
                1, 1,
                0, 0,
                1, 1,
                0, 1
            ],
            position: [x, 0, z],
            rotation: [0, rotationY, 0],
            scale: [1, 1, 1],
            texture: 'windowFrame'
        };

        // Cornice inferiore
        models[`windowFrameBottom_${index}`] = {
            vertices: [
                -windowWidth / 2 - frameWidth, y - windowHeight, frameOffset,
                windowWidth / 2 + frameWidth, y - windowHeight, frameOffset,
                windowWidth / 2 + frameWidth, y - windowHeight - frameWidth, frameOffset,
                -windowWidth / 2 - frameWidth, y - windowHeight, frameOffset,
                windowWidth / 2 + frameWidth, y - windowHeight - frameWidth, frameOffset,
                -windowWidth / 2 - frameWidth, y - windowHeight - frameWidth, frameOffset
            ],
            normals: normals,
            texcoords: [
                0, 0,
                1, 0,
                1, 1,
                0, 0,
                1, 1,
                0, 1
            ],
            position: [x, 0, z],
            rotation: [0, rotationY, 0],
            scale: [1, 1, 1],
            texture: 'windowFrame'
        };

        // Cornice sinistra
        models[`windowFrameLeft_${index}`] = {
            vertices: [
                -windowWidth / 2 - frameWidth, y + frameWidth, frameOffset,
                -windowWidth / 2, y + frameWidth, frameOffset,
                -windowWidth / 2, y - windowHeight - frameWidth, frameOffset,
                -windowWidth / 2 - frameWidth, y + frameWidth, frameOffset,
                -windowWidth / 2, y - windowHeight - frameWidth, frameOffset,
                -windowWidth / 2 - frameWidth, y - windowHeight - frameWidth, frameOffset
            ],
            normals: normals,
            texcoords: [
                0, 0,
                1, 0,
                1, 1,
                0, 0,
                1, 1,
                0, 1
            ],
            position: [x, 0, z],
            rotation: [0, rotationY, 0],
            scale: [1, 1, 1],
            texture: 'windowFrame'
        };

        // Cornice destra
        models[`windowFrameRight_${index}`] = {
            vertices: [
                windowWidth / 2, y + frameWidth, frameOffset,
                windowWidth / 2 + frameWidth, y + frameWidth, frameOffset,
                windowWidth / 2 + frameWidth, y - windowHeight - frameWidth, frameOffset,
                windowWidth / 2, y + frameWidth, frameOffset,
                windowWidth / 2 + frameWidth, y - windowHeight - frameWidth, frameOffset,
                windowWidth / 2, y - windowHeight - frameWidth, frameOffset
            ],
            normals: normals,
            texcoords: [
                0, 0,
                1, 0,
                1, 1,
                0, 0,
                1, 1,
                0, 1
            ],
            position: [x, 0, z],
            rotation: [0, rotationY, 0],
            scale: [1, 1, 1],
            texture: 'windowFrame'
        };

        // Traversa centrale orizzontale
        models[`windowFrameMiddle_${index}`] = {
            vertices: [
                -windowWidth / 2, y - windowHeight / 2 + frameWidth / 2, frameOffset,
                windowWidth / 2, y - windowHeight / 2 + frameWidth / 2, frameOffset,
                windowWidth / 2, y - windowHeight / 2 - frameWidth / 2, frameOffset,
                -windowWidth / 2, y - windowHeight / 2 + frameWidth / 2, frameOffset,
                windowWidth / 2, y - windowHeight / 2 - frameWidth / 2, frameOffset,
                -windowWidth / 2, y - windowHeight / 2 - frameWidth / 2, frameOffset
            ],
            normals: normals,
            texcoords: [
                0, 0,
                1, 0,
                1, 1,
                0, 0,
                1, 1,
                0, 1
            ],
            position: [x, 0, z],
            rotation: [0, rotationY, 0],
            scale: [1, 1, 1],
            texture: 'windowFrame'
        };

        // Traversa centrale verticale
        models[`windowFrameVertical_${index}`] = {
            vertices: [
                -frameWidth / 2, y + frameWidth, frameOffset,
                frameWidth / 2, y + frameWidth, frameOffset,
                frameWidth / 2, y - windowHeight - frameWidth, frameOffset,
                -frameWidth / 2, y + frameWidth, frameOffset,
                frameWidth / 2, y - windowHeight - frameWidth, frameOffset,
                -frameWidth / 2, y - windowHeight - frameWidth, frameOffset
            ],
            normals: normals,
            texcoords: [
                0, 0,
                1, 0,
                1, 1,
                0, 0,
                1, 1,
                0, 1
            ],
            position: [x, 0, z],
            rotation: [0, rotationY, 0],
            scale: [1, 1, 1],
            texture: 'windowFrame'
        };
    });

    logger.log('Aperture finestre create (solo cornici, senza vetro)');

    // Rimuovi eventuali texture e modelli precedenti
    if (textures['glass']) {
        gl.deleteTexture(textures['glass']);
        delete textures['glass'];
        logger.log('Texture glass.png eliminata');
    }

    if (textures['glassMaterial']) {
        gl.deleteTexture(textures['glassMaterial']);
        delete textures['glassMaterial'];
        logger.log('Texture glassMaterial eliminata');
    }

    // Rimuovi modelli precedenti
    if (models['frontWindow']) {
        delete models['frontWindow'];
        logger.log('Modello frontWindow rimosso');
    }

    if (models['backWindow']) {
        delete models['backWindow'];
        logger.log('Modello backWindow rimosso');
    }
}

// Assicurati che i muri siano presenti e visibili
function ensureWallsExist() {
    logger.log("Verifica pareti...");

    // Parete frontale
    if (!models['frontWall']) {
        logger.log("Creazione parete frontale");
        models['frontWall'] = {
            vertices: [
                -roomSize, 0, -roomSize,
                roomSize, 0, -roomSize,
                roomSize, -roomHeight, -roomSize,
                -roomSize, 0, -roomSize,
                roomSize, -roomHeight, -roomSize,
                -roomSize, -roomHeight, -roomSize
            ],
            normals: [
                0, 0, 1,
                0, 0, 1,
                0, 0, 1,
                0, 0, 1,
                0, 0, 1,
                0, 0, 1
            ],
            texcoords: [
                0, 0,
                1, 0,
                1, 1,
                0, 0,
                1, 1,
                0, 1
            ],
            position: [0, 0, 0],
            scale: [1, 1, 1],
            texture: 'wall',
            isTransparent: false
        };
    }

    // Parete posteriore
    if (!models['backWall']) {
        logger.log("Creazione parete posteriore");
        models['backWall'] = {
            vertices: [
                -roomSize, 0, roomSize,
                roomSize, -roomHeight, roomSize,
                roomSize, 0, roomSize,
                -roomSize, 0, roomSize,
                -roomSize, -roomHeight, roomSize,
                roomSize, -roomHeight, roomSize
            ],
            normals: [
                0, 0, -1,
                0, 0, -1,
                0, 0, -1,
                0, 0, -1,
                0, 0, -1,
                0, 0, -1
            ],
            texcoords: [
                0, 0,
                1, 1,
                1, 0,
                0, 0,
                0, 1,
                1, 1
            ],
            position: [0, 0, 0],
            scale: [1, 1, 1],
            texture: 'wall',
            isTransparent: false
        };
    }

    // Parete sinistra
    if (!models['leftWall']) {
        logger.log("Creazione parete sinistra");
        models['leftWall'] = {
            vertices: [
                -roomSize, 0, -roomSize,
                -roomSize, -roomHeight, -roomSize,
                -roomSize, -roomHeight, roomSize,
                -roomSize, 0, -roomSize,
                -roomSize, -roomHeight, roomSize,
                -roomSize, 0, roomSize
            ],
            normals: [
                1, 0, 0,
                1, 0, 0,
                1, 0, 0,
                1, 0, 0,
                1, 0, 0,
                1, 0, 0
            ],
            texcoords: [
                0, 0,
                0, 1,
                1, 1,
                0, 0,
                1, 1,
                1, 0
            ],
            position: [0, 0, 0],
            scale: [1, 1, 1],
            texture: 'wall',
            isTransparent: false
        };
    }

    // Parete destra
    if (!models['rightWall']) {
        logger.log("Creazione parete destra");
        models['rightWall'] = {
            vertices: [
                roomSize, 0, -roomSize,
                roomSize, 0, roomSize,
                roomSize, -roomHeight, roomSize,
                roomSize, 0, -roomSize,
                roomSize, -roomHeight, roomSize,
                roomSize, -roomHeight, -roomSize
            ],
            normals: [
                -1, 0, 0,
                -1, 0, 0,
                -1, 0, 0,
                -1, 0, 0,
                -1, 0, 0,
                -1, 0, 0
            ],
            texcoords: [
                1, 0,
                0, 0,
                0, 1,
                1, 0,
                0, 1,
                1, 1
            ],
            position: [0, 0, 0],
            scale: [1, 1, 1],
            texture: 'wall',
            isTransparent: false
        };
    }

    logger.log("Verifica pareti completata");
}

// Sistema di logging
const logger = {
    container: document.getElementById('log-container'),
    logs: [],
    enabled: false,

    log: function(message) {
        const time = new Date().toLocaleTimeString();
        this.logs.push(`[${time}] ${message}`);
        if (this.logs.length > 10) this.logs.shift();
        if (this.enabled) this.update();
        console.log(message);
    },

    update: function() {
        this.container.innerHTML = this.logs.join('<br>');
        this.container.scrollTop = this.container.scrollHeight;
    },

    toggle: function() {
        this.enabled = !this.enabled;
        this.container.style.display = this.enabled ? 'block' : 'none';
        this.update();
        this.log(`Log ${this.enabled ? 'attivati' : 'disattivati'}`);
    }
};

// Variabili globali
let gl, canvas;
let program, skyboxProgram, shadowProgram;
let lastTime = 0;
let deltaTime = 0;
let frameCount = 0;
let lastFpsUpdate = 0;

// Stato del gioco
let isPanelOpen = false;
let isLightOn = false;
let isExternalLightOn = true;
let mouseLocked = false;
let gameStarted = false;
let isNearSwitch = false;
let isSpectatorMode = false;
let showCameraCoordinates = false;

// Rendering options
let renderOptions = {
    shadows: true,
    reflections: false,
    showFPS: false,
    advancedRendering: false,
    showLogs: false
};

// Input utente
let keys = {};

// Camera e player
let camera = {
    position: [0, -1.7, 5],
    rotation: [0, 0, 0], // [pitch, yaw, roll] - Guarda verso la parete frontale
    speed: 0.05,
    defaultHeight: -1.7,
    originalPosition: [0, -1.7, 5],
    originalRotation: [0, 0, 0]
};

// Dimensioni stanza
const roomSize = 10;
const roomHeight = 5;

// Elementi della scena
let models = {};
let textures = {};
let lightPosition = [0, roomHeight - 0.5, 0];
let dollPosition = [0, 0, 0];
let switchPosition = [-roomSize + 0.1, 1.5, 0];

// Variabili movimento
let playerSpeed = 0.05;
let playerVelocity = [0, 0, 0];
let playerDirection = [0, 0, 0];
let playerOnFloor = true;
let headBobActive = true;
let isSprinting = false;

// Suoni
const sounds = {
    ambient: new Audio('sounds/ambient.mp3'),
    flicker: new Audio('sounds/flicker.wav'),
    footsteps: new Audio('sounds/random-ghost.mp3'),
    intro: new Audio('sounds/intro.mp3'),
    startGame: new Audio('sounds/start-game.mp3'),
    laLaLa: new Audio('sounds/la-la-la.mp3'),
    demonLaugh: new Audio('sounds/demon-laugh.mp3')
};

(function() {
    // Verifica se siamo su un dispositivo mobile
    const isMobile = 'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
        // Imposta meta viewport per dispositivi mobili
        const viewportMeta = document.querySelector('meta[name="viewport"]');
        if (viewportMeta) {
            viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        }

        // Previeni comportamenti indesiderati su touch
        window.addEventListener('DOMContentLoaded', function() {
            document.body.addEventListener('touchmove', function(e) {
                if (e.target.tagName !== 'CANVAS') {
                    e.preventDefault();
                }
            }, {
                passive: false
            });
        });
    }
})();

// Inizializzazione dell'app
window.onload = function() {
    // Inizializza WebGL
    canvas = document.getElementById('gl-canvas');
    gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!gl) {
        alert('Il tuo browser non supporta WebGL!');
        return;
    }

    // Imposta dimensioni canvas
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Compila shaders
    if (!initShaders()) {
        logger.log('ERRORE CRITICO: Inizializzazione shader fallita.');
        return;
    }

    // initShadowMapSafely
    initShadowMapSafely();

    // Inizializza i suoni
    initSounds();

    // Carica risorse (texture e modelli)
    loadResources();

    // Configura gli event listener
    setupEvents();

    // Crea modelli di base
    createSimpleRoom();

    // Inizializza GUI per il pannello di controllo
    initGUI();

    logger.log('Inizializzazione completata');
};

// Configura gli event listener
function setupEvents() {
    // Start button
    document.getElementById('start-button').addEventListener('click', startGame);

    // Keyboard events con supporto sprint
    document.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        handleSpecialKeys(e);

        // Attiva sprint con shift
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
            toggleSprint(true);
        }
    });

    document.addEventListener('keyup', (e) => {
        keys[e.code] = false;

        // Disattiva sprint quando si rilascia shift
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
            toggleSprint(false);
        }
    });

    // Mouse events
    canvas.addEventListener('click', requestPointerLock);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('mousemove', handleMouseMove);

    // Touch events
    setupTouchControls();

    // Panel buttons
    document.getElementById('toggleShadows').addEventListener('click', () => {
        renderOptions.shadows = !renderOptions.shadows;
        logger.log(`Ombre ${renderOptions.shadows ? 'attivate' : 'disattivate'}`);
    });

    document.getElementById('toggleReflections').addEventListener('click', () => {
        renderOptions.reflections = !renderOptions.reflections;
        logger.log(`Riflessioni ${renderOptions.reflections ? 'attivate' : 'disattivate'}`);
    });

    document.getElementById('toggleFPS').addEventListener('click', () => {
        renderOptions.showFPS = !renderOptions.showFPS;
        const fpsElement = document.getElementById('fps-counter');
        if (fpsElement) {
            fpsElement.style.display = renderOptions.showFPS ? 'block' : 'none';
        }
        logger.log(`FPS counter ${renderOptions.showFPS ? 'attivato' : 'disattivato'}`);
    });

    document.getElementById('toggleLogs').addEventListener('click', () => {
        logger.toggle();
    });

    document.getElementById('advancedRendering').addEventListener('click', () => {
        renderOptions.advancedRendering = !renderOptions.advancedRendering;
        logger.log(`Rendering avanzato ${renderOptions.advancedRendering ? 'attivato' : 'disattivato'}`);
    });

    document.getElementById('toggleExternalLight').addEventListener('click', () => {
        isExternalLightOn = !isExternalLightOn;
        logger.log(`Luce esterna ${isExternalLightOn ? 'accesa' : 'spenta'}`);
    });

    document.getElementById('toggleCameraInfo').addEventListener('click', () => {
        showCameraCoordinates = !showCameraCoordinates;
        const coordElement = document.getElementById('camera-coords');
        if (coordElement) {
            coordElement.style.display = showCameraCoordinates ? 'block' : 'none';
        }
        logger.log(`Info camera ${showCameraCoordinates ? 'attivate' : 'disattivate'}`);
    });

    document.getElementById('toggleSpectatorMode').addEventListener('click', () => {
        toggleSpectatorMode();
    });

    document.getElementById('toggleRoomLight').addEventListener('click', () => {
        isLightOn = !isLightOn;
        logger.log(`Luce stanza ${isLightOn ? 'accesa' : 'spenta'} dal pannello di controllo`);

        // Effetto di flickering quando la luce si accende
        if (isLightOn) {
            flickerLight();
            sounds.flicker.play();
        }
    });

    logger.log('Event listeners configurati');
}

// Game loop
function gameLoop(time) {
    // Calcola delta time
    deltaTime = lastTime ? (time - lastTime) / 1000 : 0;
    lastTime = time;

    // Aggiorna FPS counter ogni secondo
    frameCount++;
    if (time - lastFpsUpdate > 1000) {
        updateFPSCounter(frameCount);
        frameCount = 0;
        lastFpsUpdate = time;
    }

    // Aggiorna
    update(deltaTime);

    // Anima l'interruttore
    animateSwitchButton();

    // Renderizza
    render();

    // Continua il loop
    requestAnimationFrame(gameLoop);
}

// Funzione per aggiornare il contatore FPS
function updateFPSCounter(fps) {
    if (!renderOptions.showFPS) return;

    // Crea o aggiorna elemento FPS
    let fpsElement = document.getElementById('fps-counter');
    if (!fpsElement) {
        fpsElement = document.createElement('div');
        fpsElement.id = 'fps-counter';
        document.body.appendChild(fpsElement);
    }

    fpsElement.textContent = `FPS: ${fps}`;
    fpsElement.style.display = 'block';
}

// Update game state
function update(dt) {
    // Skip update if panel is open
    if (isPanelOpen || !gameStarted) return;

    // Update camera based on input
    updateCamera(dt);

    // Aggiorna crosshair ogni 3 frame
    if (frameCount % 3 === 0) {
        updateCrosshair();
    }

    // Coordinate camera solo se attive e ogni 5 frame
    if (showCameraCoordinates && frameCount % 5 === 0) {
        updateCameraCoordinates();
    }

    // Vicinanza bambola ogni 10 frame
    if (frameCount % 10 === 0) {
        checkDollProximity();
    }
}

// Gestione tasti speciali
function handleSpecialKeys(e) {
    if (e.code === 'KeyP') {
        togglePanel();
    } else if (e.code === 'KeyF') {
        if (isNearSwitch) {
            toggleLight();
        }
    }
}

// Attiva/disattiva pannello
function togglePanel() {
    isPanelOpen = !isPanelOpen;
    document.getElementById('side-panel').className = isPanelOpen ? 'visible' : 'hidden';

    if (isPanelOpen) {
        document.exitPointerLock();
    } else if (mouseLocked) {
        requestPointerLock();
    }

    logger.log(`Pannello ${isPanelOpen ? 'aperto' : 'chiuso'}`);
}

// Attiva/disattiva luce
function toggleLight() {
    // Verifica se il giocatore è vicino all'interruttore CORRETTO sulla parete destra
    if (isNearSwitch) {
        isLightOn = !isLightOn;
        document.getElementById('instructions').style.visibility = isLightOn ? 'hidden' : 'visible';

        // Effetto di flickering quando la luce si accende
        if (isLightOn) {
            flickerLight();
            sounds.flicker.play();
        }

        logger.log(`Luce ${isLightOn ? 'accesa' : 'spenta'}`);
    } else {
        logger.log("Devi essere vicino all'interruttore CORRETTO sulla parete destra per accendere/spegnere la luce");
    }
}

// Effetto flickering della luce
function flickerLight() {
    let flickerCount = Math.floor(Math.random() * 5) + 3; // Numero di lampeggi tra 3 e 7
    const originalStatus = isLightOn;

    const flickerInterval = setInterval(() => {
        isLightOn = !isLightOn;
        flickerCount--;

        if (flickerCount <= 0) {
            clearInterval(flickerInterval);
            isLightOn = originalStatus; // Ripristina lo stato originale
        }
    }, 100);
}

// Avvia il gioco
function startGame() {
    // NUOVO: Inizializza l'illuminazione corretta prima di avviare il gioco
    initializeProperLighting();

    switchPosition = [-9.7, -2, 0];

    const instructions = ensureInstructionsExist();
    instructions.style.visibility = 'hidden'; // Inizialmente nascosto
    logger.log("Elemento instructions verificato e configurato all'avvio del gioco");

    // Forza un update del crosshair
    setTimeout(() => {
        const nearSwitch = updateCrosshair();
    }, 1000);

    document.getElementById('start-menu').style.display = 'none';
    document.getElementById('crosshair').style.display = 'block';
    document.getElementById('top-bar').style.display = 'flex';

    // Correggi la posizione dell'interruttore subito
    fixSwitchPosition();

    // Assicuriamo che l'elemento instructions sia visibile e stilizzato correttamente
    const instructionsElement = document.getElementById('instructions');
    if (instructionsElement) {
        instructionsElement.innerHTML = 'Premi <span style="color:#ff4d4d">F</span> per accendere la luce';
        logger.log(`Elemento instructions trovato e configurato correttamente`);
    } else {
        logger.log(`ERRORE: Elemento instructions non trovato!`);

        // Crea l'elemento se non esiste
        const newInstructionsElement = document.createElement('div');
        newInstructionsElement.id = 'instructions';
        newInstructionsElement.style.visibility = 'hidden';
        newInstructionsElement.innerHTML = 'Premi <span style="color:#ff4d4d">F</span> per accendere la luce';
        newInstructionsElement.style.position = 'absolute';
        newInstructionsElement.style.bottom = '20px';
        newInstructionsElement.style.left = '50%';
        newInstructionsElement.style.transform = 'translateX(-50%)';
        newInstructionsElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        newInstructionsElement.style.padding = '10px';
        newInstructionsElement.style.borderRadius = '5px';
        newInstructionsElement.style.zIndex = '10';
        document.body.appendChild(newInstructionsElement);
        logger.log(`Elemento instructions creato dinamicamente`);
    }

    // Sincronizza la posizione dell'interruttore all'avvio
    updateSwitchPosition();

    // Forza un aggiornamento del crosshair
    setTimeout(() => {
        updateCrosshair();
    }, 1000);

    // Mostra controlli completi
    document.getElementById('game-controls').innerHTML =
        'W: Avanti | S: Indietro | A: Sinistra | D: Destra | F: Luce | P: Pannello | SHIFT: Sprint';

    // Aggiungi informazioni sul pannello di controllo
    const panelInfo = document.createElement('div');
    panelInfo.id = 'panel-info';
    panelInfo.innerHTML = 'Nel pannello (P): Modalità Spettatore (Q: Scendi, E: Sali)';
    panelInfo.style.position = 'absolute';
    panelInfo.style.top = '40px';
    panelInfo.style.left = '50%';
    panelInfo.style.transform = 'translateX(-50%)';
    panelInfo.style.backgroundColor = 'rgba(0,0,0,0.7)';
    panelInfo.style.color = 'white';
    panelInfo.style.padding = '5px';
    panelInfo.style.fontSize = '12px';
    panelInfo.style.borderRadius = '3px';
    document.body.appendChild(panelInfo);

    // Mostra un suggerimento sull'interruttore
    const switchHint = document.createElement('div');
    switchHint.id = 'switch-hint';
    switchHint.innerHTML = 'Cerca l\'interruttore sulla parete DESTRA!';
    switchHint.style.position = 'absolute';
    switchHint.style.bottom = '80px';
    switchHint.style.left = '50%';
    switchHint.style.transform = 'translateX(-50%)';
    switchHint.style.backgroundColor = 'rgba(0,0,0,0.7)';
    switchHint.style.color = '#ff4d4d';
    switchHint.style.padding = '10px';
    switchHint.style.borderRadius = '5px';
    switchHint.style.animation = 'pulse 2s infinite';
    switchHint.style.fontSize = '18px';
    switchHint.style.fontWeight = 'bold';
    switchHint.style.textAlign = 'center';
    document.body.appendChild(switchHint);

    // Nascondi il suggerimento dopo 15 secondi
    setTimeout(() => {
        switchHint.style.display = 'none';
    }, 15000);

    // Gestisci audio
    if (sounds.intro) {
        sounds.intro.pause();
    }
    if (sounds.startGame) {
        sounds.startGame.play();

        // Avvia l'audio ambientale quando termina la musica di inizio
        if (sounds.ambient) {
            sounds.startGame.onended = () => {
                sounds.ambient.play();
            };
        }
    } else if (sounds.ambient) {
        // Se non c'è musica di inizio, avvia direttamente l'audio ambientale
        sounds.ambient.play();
    }

    // Richiedi pointer lock per il controllo della camera
    requestPointerLock();

    // Imposta lo stato di gioco e avvia il loop
    gameStarted = true;
    requestAnimationFrame(gameLoop);

    logger.log('Gioco avviato');
}

// Questa funzione aggiorna la posizione interattiva dello switch
// e si assicura che NON ci siano aree interattive errate nella parete sinistra
function fixSwitchPosition() {
    // Posizione corretta dell'interruttore sulla parete destra
    const correctX = 9.99; // Parete destra
    const correctY = -2.0; // Altezza
    const correctZ = 0; // Centro stanza

    // Imposta la posizione corretta dello switch per l'interazione
    switchPosition = [correctX, correctY, correctZ];

    // Verifica che non ci siano modelli obsoleti nella parete sinistra
    // che potrebbero causare falsi trigger dell'interazione
    for (const modelName in models) {
        // Cerca eventuali modelli dell'interruttore sulla parete sbagliata
        if (modelName.includes('switch') || modelName.includes('Switch')) {
            const model = models[modelName];
            // Se c'è un modello dell'interruttore sulla parete sinistra
            if (model.position && model.position[0] < 0) {
                model.position = [correctX, correctY, correctZ];

                // Se è un indicatore, posizionalo accanto
                if (modelName.includes('indicator') || modelName.includes('Indicator')) {
                    model.position = [correctX, correctY, correctZ - 0.8];
                }
            }
        }
    }
}

// Inizializzazione del pannello GUI avanzato
function initGUI() {
    // Aggiorniamo l'aspetto del pannello laterale
    const sidePanel = document.getElementById('side-panel');
    sidePanel.innerHTML = ''; // Rimuoviamo il contenuto esistente

    // Stile migliorato
    sidePanel.style.width = '320px';
    sidePanel.style.backgroundColor = 'rgba(20, 20, 20, 0.9)';
    sidePanel.style.borderLeft = '2px solid #ff4d4d';
    sidePanel.style.boxShadow = '-5px 0 20px rgba(255, 77, 77, 0.3)';

    // Titolo del pannello
    const header = document.createElement('div');
    header.innerHTML = `
        <h2 style="font-family: 'Creepster', cursive; color: #ff4d4d; margin: 0; font-size: 28px; 
                    text-shadow: 0 0 10px rgba(255, 77, 77, 0.5); text-align: center; padding: 15px 0;">
            Pannello di Controllo
        </h2>
        <p style="color: #aaa; text-align: center; margin-bottom: 25px; padding: 0 20px;">
            Gestisci le impostazioni della casa infestata
        </p>
    `;
    sidePanel.appendChild(header);

    // SEZIONE: ILLUMINAZIONE
    addSection(sidePanel, 'Illuminazione');

    // Toggle per la luce della stanza
    addBasicToggle(sidePanel, 'Luce Stanza', isLightOn, function() {
        isLightOn = !isLightOn;
        if (isLightOn) {
            flickerLight();
            sounds.flicker.play();
        }
        logger.log(`Luce stanza ${isLightOn ? 'accesa' : 'spenta'} dal pannello`);
    });

    // Toggle per la luce esterna
    addBasicToggle(sidePanel, 'Luce Esterna', isExternalLightOn, function() {
        isExternalLightOn = !isExternalLightOn;
        logger.log(`Luce esterna ${isExternalLightOn ? 'accesa' : 'spenta'}`);
    });

    // SEZIONE: RENDERING
    addSection(sidePanel, 'Rendering');

    // Toggle per le ombre
    addBasicToggle(sidePanel, 'Ombre', renderOptions.shadows, function() {
        renderOptions.shadows = !renderOptions.shadows;
        logger.log(`Ombre ${renderOptions.shadows ? 'attivate' : 'disattivate'}`);
    });

    // Toggle per le riflessioni
    addBasicToggle(sidePanel, 'Riflessioni', renderOptions.reflections, function() {
        renderOptions.reflections = !renderOptions.reflections;
        logger.log(`Riflessioni ${renderOptions.reflections ? 'attivate' : 'disattivate'}`);
    });

    // Toggle per il rendering avanzato
    addBasicToggle(sidePanel, 'Rendering Avanzato', renderOptions.advancedRendering, function() {
        renderOptions.advancedRendering = !renderOptions.advancedRendering;
        logger.log(`Rendering avanzato ${renderOptions.advancedRendering ? 'attivato' : 'disattivato'}`);
    });

    // SEZIONE: CAMERA
    addSection(sidePanel, 'Fotocamera');

    // Toggle per la modalità spettatore
    addBasicToggle(sidePanel, 'Modalità Spettatore', isSpectatorMode, function() {
        toggleSpectatorMode();
    });

    // Toggle per le coordinate della camera
    addBasicToggle(sidePanel, 'Mostra Coordinate', showCameraCoordinates, function() {
        showCameraCoordinates = !showCameraCoordinates;
        const coordElement = document.getElementById('camera-coords');
        if (coordElement) {
            coordElement.style.display = showCameraCoordinates ? 'block' : 'none';
        }
        logger.log(`Coordinate camera ${showCameraCoordinates ? 'visibili' : 'nascoste'}`);
    });

    // SEZIONE: DEBUG
    addSection(sidePanel, 'Debug');

    // Toggle per i log
    addBasicToggle(sidePanel, 'Mostra Log', logger.enabled, function() {
        logger.toggle();
    });

    // Toggle per FPS
    addBasicToggle(sidePanel, 'Mostra FPS', renderOptions.showFPS, function() {
        renderOptions.showFPS = !renderOptions.showFPS;
        const fpsElement = document.getElementById('fps-counter');
        if (fpsElement) {
            fpsElement.style.display = renderOptions.showFPS ? 'block' : 'none';
        }
        logger.log(`FPS counter ${renderOptions.showFPS ? 'attivato' : 'disattivato'}`);
    });

    // Bottone per resettare la posizione
    const resetButton = document.createElement('button');
    resetButton.textContent = 'Ripristina Posizione';
    resetButton.style.width = 'calc(100% - 40px)';
    resetButton.style.margin = '10px 20px';
    resetButton.style.padding = '10px';
    resetButton.style.backgroundColor = '#333';
    resetButton.style.color = '#fff';
    resetButton.style.border = '1px solid #666';
    resetButton.style.borderRadius = '5px';
    resetButton.style.cursor = 'pointer';
    resetButton.onclick = function() {
        // Ripristina la posizione originale
        camera.position = [...camera.originalPosition];
        camera.rotation = [...camera.originalRotation];
        logger.log('Posizione camera ripristinata');
    };
    sidePanel.appendChild(resetButton);

    // Bottone di chiusura
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Chiudi Pannello';
    closeButton.style.width = 'calc(100% - 40px)';
    closeButton.style.margin = '20px';
    closeButton.style.padding = '15px';
    closeButton.style.backgroundColor = '#ff4d4d';
    closeButton.style.color = '#fff';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '5px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontWeight = 'bold';
    closeButton.style.fontSize = '16px';
    closeButton.style.fontFamily = "'Creepster', cursive";
    closeButton.onclick = togglePanel;
    sidePanel.appendChild(closeButton);

    logger.log('Pannello di controllo semplificato inizializzato');
}

// Funzione semplificata per aggiungere una sezione
function addSection(parent, title) {
    const section = document.createElement('div');
    section.innerHTML = `
        <h3 style="margin: 20px 0 10px 20px; color: #ddd; font-size: 18px; 
                   border-bottom: 1px solid #444; padding-bottom: 5px;">
            ${title}
        </h3>
    `;
    parent.appendChild(section);
}

// Funzione per migliorare ombre
function initShadowMapSafely() {
    // Verifica che WebGL sia inizializzato
    if (!gl) {
        logger.log('WebGL non ancora inizializzato per shadow map');
        setTimeout(initShadowMapSafely, 100);
        return;
    }

    try {
        logger.log('Tentativo inizializzazione shadow map semplificata...');

        // VERSIONE SEMPLIFICATA: Usa una texture normale invece di depth texture
        shadowFramebuffer = gl.createFramebuffer();
        shadowTexture = gl.createTexture();

        if (!shadowFramebuffer || !shadowTexture) {
            throw new Error('Impossibile creare framebuffer o texture');
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFramebuffer);
        gl.bindTexture(gl.TEXTURE_2D, shadowTexture);

        // Crea texture RGBA normale (senza problemi di compatibilità)
        const shadowMapData = new Uint8Array(shadowMapSize * shadowMapSize * 4);
        shadowMapData.fill(255); // Riempi di bianco

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
            shadowMapSize, shadowMapSize, 0,
            gl.RGBA, gl.UNSIGNED_BYTE, shadowMapData);

        // Parametri texture base
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // Collega la texture al framebuffer
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
            gl.TEXTURE_2D, shadowTexture, 0);

        // Crea depth buffer separato
        const depthBuffer = gl.createRenderbuffer();
        if (depthBuffer) {
            gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16,
                shadowMapSize, shadowMapSize);
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT,
                gl.RENDERBUFFER, depthBuffer);
        }

        // Verifica status del framebuffer
        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (status !== gl.FRAMEBUFFER_COMPLETE) {
            throw new Error(`Framebuffer incompleto: ${status}`);
        }

        // Ripristina binding
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);

        logger.log(`Shadow map semplificata inizializzata: ${shadowMapSize}x${shadowMapSize}`);

    } catch (error) {
        logger.log(`Errore shadow map: ${error.message}`);
        logger.log('Disabilitazione ombre per compatibilità');

        // Disabilita completamente le ombre
        renderOptions.shadows = false;
        shadowFramebuffer = null;
        shadowTexture = null;

        // Cleanup eventuali risorse parziali
        if (shadowFramebuffer) {
            gl.deleteFramebuffer(shadowFramebuffer);
            shadowFramebuffer = null;
        }
        if (shadowTexture) {
            gl.deleteTexture(shadowTexture);
            shadowTexture = null;
        }
    }
}

// Funzione semplificata per aggiungere un toggle switch funzionante
function addBasicToggle(parent, label, initialState, onChange) {
    const toggleContainer = document.createElement('div');
    toggleContainer.style.display = 'flex';
    toggleContainer.style.justifyContent = 'space-between';
    toggleContainer.style.alignItems = 'center';
    toggleContainer.style.padding = '5px 20px';
    toggleContainer.style.margin = '10px 0';

    // Etichetta
    const labelElement = document.createElement('span');
    labelElement.textContent = label;
    labelElement.style.color = '#ccc';

    // Bottone semplice che funziona sicuramente
    const button = document.createElement('button');
    button.textContent = initialState ? 'ON' : 'OFF';
    button.style.backgroundColor = initialState ? '#ff4d4d' : '#555';
    button.style.color = '#fff';
    button.style.border = 'none';
    button.style.borderRadius = '15px';
    button.style.padding = '5px 15px';
    button.style.cursor = 'pointer';
    button.style.minWidth = '60px';
    button.style.transition = 'background-color 0.3s';

    button.onclick = function() {
        if (onChange) onChange();
        button.textContent = button.textContent === 'ON' ? 'OFF' : 'ON';
        button.style.backgroundColor = button.textContent === 'ON' ? '#ff4d4d' : '#555';
    };

    toggleContainer.appendChild(labelElement);
    toggleContainer.appendChild(button);
    parent.appendChild(toggleContainer);
}

// Funzione per creare una sezione del pannello
function createSection(title, iconName) {
    const section = document.createElement('div');
    section.className = 'panel-section';
    section.style.marginBottom = '25px';
    section.style.borderBottom = '1px solid #444';
    section.style.paddingBottom = '15px';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.marginBottom = '15px';

    const icon = document.createElement('div');
    icon.style.width = '24px';
    icon.style.height = '24px';
    icon.style.marginRight = '10px';
    icon.style.backgroundImage = `url('images/icons/${iconName}')`;
    icon.style.backgroundSize = 'contain';
    icon.style.backgroundRepeat = 'no-repeat';

    const sectionTitle = document.createElement('h3');
    sectionTitle.textContent = title;
    sectionTitle.style.margin = '0';
    sectionTitle.style.color = '#ddd';
    sectionTitle.style.fontSize = '18px';

    header.appendChild(icon);
    header.appendChild(sectionTitle);
    section.appendChild(header);

    return section;
}

// Funzione per aggiungere un toggle switch
function addToggle(parent, label, initialState, onChange) {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.justifyContent = 'space-between';
    container.style.alignItems = 'center';
    container.style.margin = '10px 0';

    const labelElem = document.createElement('label');
    labelElem.textContent = label;
    labelElem.style.color = '#ccc';

    const toggleWrapper = document.createElement('div');
    toggleWrapper.style.position = 'relative';
    toggleWrapper.style.width = '50px';
    toggleWrapper.style.height = '24px';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = initialState;
    checkbox.style.opacity = '0';
    checkbox.style.width = '0';
    checkbox.style.height = '0';

    const slider = document.createElement('span');
    slider.style.position = 'absolute';
    slider.style.cursor = 'pointer';
    slider.style.top = '0';
    slider.style.left = '0';
    slider.style.right = '0';
    slider.style.bottom = '0';
    slider.style.backgroundColor = initialState ? '#ff4d4d' : '#555';
    slider.style.transition = '0.4s';
    slider.style.borderRadius = '24px';

    const knob = document.createElement('span');
    knob.style.position = 'absolute';
    knob.style.content = '""';
    knob.style.height = '16px';
    knob.style.width = '16px';
    knob.style.left = initialState ? '30px' : '4px';
    knob.style.bottom = '4px';
    knob.style.backgroundColor = 'white';
    knob.style.transition = '0.4s';
    knob.style.borderRadius = '50%';

    checkbox.addEventListener('change', function() {
        slider.style.backgroundColor = this.checked ? '#ff4d4d' : '#555';
        knob.style.left = this.checked ? '30px' : '4px';
        if (onChange) onChange(this.checked);
    });

    slider.appendChild(knob);
    toggleWrapper.appendChild(checkbox);
    toggleWrapper.appendChild(slider);

    container.appendChild(labelElem);
    container.appendChild(toggleWrapper);

    parent.appendChild(container);
}

// Funzione per aggiungere uno slider
function addSlider(parent, label, initialValue, min, max, step, onChange) {
    const container = document.createElement('div');
    container.style.margin = '15px 0';

    const labelContainer = document.createElement('div');
    labelContainer.style.display = 'flex';
    labelContainer.style.justifyContent = 'space-between';
    labelContainer.style.marginBottom = '5px';

    const labelElem = document.createElement('label');
    labelElem.textContent = label;
    labelElem.style.color = '#ccc';

    const valueDisplay = document.createElement('span');
    valueDisplay.textContent = initialValue.toFixed(1);
    valueDisplay.style.color = '#ff4d4d';

    labelContainer.appendChild(labelElem);
    labelContainer.appendChild(valueDisplay);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = min;
    slider.max = max;
    slider.step = step;
    slider.value = initialValue;
    slider.style.width = '100%';
    slider.style.height = '8px';
    slider.style.borderRadius = '4px';
    slider.style.appearance = 'none';
    slider.style.backgroundColor = '#333';
    slider.style.outline = 'none';

    // Styling personalizzato per lo slider
    const style = document.createElement('style');
    style.textContent = `
        input[type=range]::-webkit-slider-thumb {
            appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #ff4d4d;
            cursor: pointer;
        }
        input[type=range]::-moz-range-thumb {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #ff4d4d;
            cursor: pointer;
        }
    `;
    document.head.appendChild(style);

    slider.addEventListener('input', function() {
        valueDisplay.textContent = parseFloat(this.value).toFixed(1);
        if (onChange) onChange(parseFloat(this.value));
    });

    container.appendChild(labelContainer);
    container.appendChild(slider);

    parent.appendChild(container);
}

// Funzione migliorata per l'animazione dell'interruttore
function animateSwitchButton() {
    // Verifica che l'interruttore esista
    if (!models['switch']) {
        return;
    }

    const switchModel = models['switch'];
    const time = Date.now() * 0.001;

    // Animazione per quando il giocatore è vicino all'interruttore
    if (isNearSwitch) {
        // Pulsazione dell'interruttore (scaling)
        const pulseScale = 1.0 + Math.sin(time * 4) * 0.05;

        // Applica la scala mantenendo le proporzioni originali
        if (switchModel.originalScale) {
            switchModel.scale = [
                switchModel.originalScale[0] * pulseScale,
                switchModel.originalScale[1] * pulseScale,
                switchModel.originalScale[2] * pulseScale
            ];
        } else {
            switchModel.originalScale = [...switchModel.scale];
            switchModel.scale = [
                switchModel.scale[0] * pulseScale,
                switchModel.scale[1] * pulseScale,
                switchModel.scale[2] * pulseScale
            ];
        }

        // Effetto visivo per indicare che l'interruttore può essere usato
        if (!document.getElementById('switch-glow')) {
            const switchGlow = document.createElement('div');
            switchGlow.id = 'switch-glow';
            switchGlow.style.position = 'fixed';
            switchGlow.style.top = '50%';
            switchGlow.style.left = '50%';
            switchGlow.style.transform = 'translate(-50%, -50%)';
            switchGlow.style.width = '50px';
            switchGlow.style.height = '50px';
            switchGlow.style.borderRadius = '50%';
            switchGlow.style.backgroundColor = 'rgba(255, 77, 77, 0.3)';
            switchGlow.style.boxShadow = '0 0 20px rgba(255, 77, 77, 0.7)';
            switchGlow.style.animation = 'pulse 1s infinite alternate';
            switchGlow.style.pointerEvents = 'none';
            switchGlow.style.zIndex = '1';
            document.body.appendChild(switchGlow);

            // Aggiungi l'animazione se non esiste
            if (!document.getElementById('pulse-animation')) {
                const style = document.createElement('style');
                style.id = 'pulse-animation';
                style.textContent = `
                    @keyframes pulse {
                        0% { transform: translate(-50%, -50%) scale(1); opacity: 0.3; }
                        100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0.1; }
                    }
                `;
                document.head.appendChild(style);
            }
        }
    } else {
        // Se il giocatore non è vicino, ripristina la scala originale
        if (switchModel.originalScale) {
            switchModel.scale = [...switchModel.originalScale];
        }

        // Rimuovi l'effetto visivo se esiste
        const switchGlow = document.getElementById('switch-glow');
        if (switchGlow) {
            document.body.removeChild(switchGlow);
        }
    }
}

// Aggiornata la funzione toggleLight per migliorare il feedback visivo
function toggleLight() {
    // Verifica se il giocatore è vicino all'interruttore
    if (isNearSwitch) {
        isLightOn = !isLightOn;
        document.getElementById('instructions').style.visibility = isLightOn ? 'hidden' : 'visible';

        // Effetto di flickering quando la luce si accende
        if (isLightOn) {
            flickerLight();
            sounds.flicker.play();

            // Aggiungiamo un effetto visivo a tutto schermo
            const flashEffect = document.createElement('div');
            flashEffect.style.position = 'fixed';
            flashEffect.style.top = '0';
            flashEffect.style.left = '0';
            flashEffect.style.width = '100%';
            flashEffect.style.height = '100%';
            flashEffect.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
            flashEffect.style.zIndex = '999';
            flashEffect.style.pointerEvents = 'none';
            document.body.appendChild(flashEffect);

            // Rimuovi l'effetto flash dopo un breve periodo
            setTimeout(() => {
                document.body.removeChild(flashEffect);
            }, 100);
        } else {
            // Flash breve di buio totale
            const darkFlash = document.createElement('div');
            darkFlash.style.position = 'fixed';
            darkFlash.style.top = '0';
            darkFlash.style.left = '0';
            darkFlash.style.width = '100%';
            darkFlash.style.height = '100%';
            darkFlash.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            darkFlash.style.zIndex = '999';
            darkFlash.style.pointerEvents = 'none';
            document.body.appendChild(darkFlash);

            // Rimuovi l'effetto gradualmente
            setTimeout(() => {
                darkFlash.style.transition = 'opacity 0.5s';
                darkFlash.style.opacity = '0';
                setTimeout(() => {
                    if (document.body.contains(darkFlash)) {
                        document.body.removeChild(darkFlash);
                    }
                }, 500);
            }, 100);
        }
    }
}

// Configurazione controlli touch
function setupTouchControls() {
    // Rileva se siamo su mobile
    const isMobile = 'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
        logger.log('Dispositivo mobile rilevato - Attivazione controlli touch migliorati');

        // Mostra i controlli mobile
        const mobileControls = document.getElementById('mobile-controls');
        if (mobileControls) mobileControls.classList.add('active');

        // Setup controlli direzionali
        setupDirectionalControls();

        // Setup controlli azione
        setupActionControls();

        // Setup controlli spettatore
        setupSpectatorControls();

        // Setup controllo camera SEMPRE ATTIVO
        setupAlwaysActiveCameraControl();

        // Setup indicatori di interazione
        setupMobileInteractionHints();

        // Previeni comportamenti di scroll indesiderati
        document.addEventListener('touchmove', function(e) {
            // Permetti il movimento camera sempre
            if (e.target.tagName === 'CANVAS') {
                e.preventDefault();
            }
            // Blocca scroll solo per i controlli mobile specifici
            if (e.target.closest('.mobile-controls') && !e.target.tagName === 'CANVAS') {
                e.preventDefault();
            }
        }, {
            passive: false
        });

        // Previeni zoom accidentale con doppio tap
        let lastTouchEnd = 0;
        document.addEventListener('touchend', function (event) {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
    }
}

// Setup controllo camera sempre attivo su mobile
function setupAlwaysActiveCameraControl() {
    let lastTouchX = 0;
    let lastTouchY = 0;
    let isLooking = false;

    // Gestione touch sul canvas per la rotazione camera
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        // CORREZIONE: Rimuovo il controllo del numero di tocchi
        // Uso sempre il primo tocco disponibile, indipendentemente da quanti ce ne sono
        if (e.touches.length > 0) {
            isLooking = true;
            lastTouchX = e.touches[0].clientX;
            lastTouchY = e.touches[0].clientY;
        }
    });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        // CORREZIONE: Rimuovo il controllo del numero di tocchi
        // La camera può ruotare anche se l'utente sta premendo WASD
        if (isLooking && e.touches.length > 0) {
            const touchX = e.touches[0].clientX;
            const touchY = e.touches[0].clientY;

            // Sensibilità calibrata per mobile
            const sensitivity = 0.003;

            const deltaX = touchX - lastTouchX;
            const deltaY = touchY - lastTouchY;

            // Aggiorna rotazione camera
            camera.rotation[1] += deltaX * sensitivity;
            camera.rotation[0] += deltaY * sensitivity;

            // Limita rotazione verticale
            camera.rotation[0] = Math.max(-Math.PI / 2 + 0.1,
                Math.min(Math.PI / 2 - 0.1, camera.rotation[0]));

            lastTouchX = touchX;
            lastTouchY = touchY;
        }
    });

    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        // CORREZIONE: Ferma la rotazione solo quando non ci sono più tocchi sul canvas
        if (e.touches.length === 0) {
            isLooking = false;
        } else if (e.touches.length > 0) {
            // Se ci sono ancora tocchi, aggiorna la posizione di riferimento
            lastTouchX = e.touches[0].clientX;
            lastTouchY = e.touches[0].clientY;
        }
    });

    canvas.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        isLooking = false;
    });

    logger.log('Controllo camera sempre attivo configurato - VERSIONE CORRETTA');
}

// Setup controlli direzionali (WASD)
function setupDirectionalControls() {
    const directionalButtons = document.querySelectorAll('.direction-btn');

    directionalButtons.forEach(button => {
        const keyCode = button.dataset.key;

        // Touch start - attiva movimento
        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Previeni interferenza con il canvas
            keys[keyCode] = true;
            button.classList.add('active');

            // Feedback visivo e tattile
            if (navigator.vibrate) {
                navigator.vibrate(30);
            }
            
            logger.log(`Movimento ${keyCode} attivato`);
        });

        // Touch end - ferma movimento
        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            keys[keyCode] = false;
            button.classList.remove('active');
            
            logger.log(`Movimento ${keyCode} fermato`);
        });

        // Touch cancel - gestisci interruzioni
        button.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            e.stopPropagation();
            keys[keyCode] = false;
            button.classList.remove('active');
        });

        // Previeni drag
        button.addEventListener('touchmove', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });

        // Previeni context menu
        button.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    });

    logger.log('Controlli direzionali configurati con stop propagation');
}

// Setup controlli azione (F, P, etc.)
function setupActionControls() {
    // Pulsante luce (F)
    const lightButton = document.getElementById('touch-light');
    if (lightButton) {
        lightButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (isNearSwitch) {
                toggleLight();
                showMobileMessage('Interruttore attivato!', 1000);
                // Feedback tattile più intenso per azioni importanti
                if (navigator.vibrate) {
                    navigator.vibrate([100, 50, 100]);
                }
            } else {
                showMobileMessage('Avvicinati all\'interruttore', 1500);
                if (navigator.vibrate) {
                    navigator.vibrate(200);
                }
            }
            
            logger.log('Pulsante luce premuto su mobile');
        });

        // Previeni eventi multipli
        lightButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });

        lightButton.addEventListener('touchmove', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    }

    // Pulsante pannello (P)
    const panelButton = document.getElementById('touch-panel');
    if (panelButton) {
        panelButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            togglePanel();
            showMobileMessage(isPanelOpen ? 'Pannello aperto' : 'Pannello chiuso', 1000);
            
            if (navigator.vibrate) {
                navigator.vibrate(75);
            }
            
            logger.log('Pulsante pannello premuto su mobile');
        });

        panelButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });

        panelButton.addEventListener('touchmove', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    }
}

// Setup controlli spettatore (Q, E)
function setupSpectatorControls() {
    const spectatorButtons = document.querySelectorAll('.spectator-btn');

    spectatorButtons.forEach(button => {
        const keyCode = button.dataset.key;

        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (isSpectatorMode) {
                keys[keyCode] = true;
                button.classList.add('active');
                
                const action = keyCode === 'KeyQ' ? 'scendi' : 'sali';
                logger.log(`Spettatore: ${action} attivato`);
                
                if (navigator.vibrate) {
                    navigator.vibrate(40);
                }
            } else {
                showMobileMessage('Attiva modalità spettatore dal pannello', 2000);
            }
        });

        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            keys[keyCode] = false;
            button.classList.remove('active');
        });

        button.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            e.stopPropagation();
            keys[keyCode] = false;
            button.classList.remove('active');
        });

        button.addEventListener('touchmove', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    logger.log('Controlli spettatore configurati');
}

// Setup controllo camera
function setupCameraControl() {
    const cameraControl = document.getElementById('camera-control');
    let lookMode = false;
    let lastTouchX = 0;
    let lastTouchY = 0;
    let isLooking = false;

    if (cameraControl) {
        // Toggle modalità look
        cameraControl.addEventListener('touchstart', (e) => {
            e.preventDefault();
            lookMode = !lookMode;

            cameraControl.classList.toggle('active', lookMode);

            if (lookMode) {
                showMobileMessage('Modalità Camera: Tocca e trascina sul canvas per guardare intorno', 3000);
            } else {
                showMobileMessage('Modalità Camera disattivata', 1500);
            }

            if (navigator.vibrate) {
                navigator.vibrate(lookMode ? [50, 50, 50] : 100);
            }
        });
    }

    // Gestione touch sul canvas per la rotazione camera
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (lookMode && e.touches.length === 1) {
            isLooking = true;
            lastTouchX = e.touches[0].clientX;
            lastTouchY = e.touches[0].clientY;
        }
    });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (lookMode && isLooking && e.touches.length === 1) {
            const touchX = e.touches[0].clientX;
            const touchY = e.touches[0].clientY;

            // Sensibilità calibrata per mobile
            const sensitivity = 0.005;

            const deltaX = touchX - lastTouchX;
            const deltaY = touchY - lastTouchY;

            // Aggiorna rotazione camera
            camera.rotation[1] += deltaX * sensitivity;
            camera.rotation[0] += deltaY * sensitivity;

            // Limita rotazione verticale
            camera.rotation[0] = Math.max(-Math.PI / 2 + 0.1,
                Math.min(Math.PI / 2 - 0.1, camera.rotation[0]));

            lastTouchX = touchX;
            lastTouchY = touchY;
        }
    });

    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        isLooking = false;
    });

    canvas.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        isLooking = false;
    });
}

// Setup indicatori di interazione mobile
function setupMobileInteractionHints() {
    const hintElement = document.getElementById('mobile-interaction-hint');

    // Aggiorna la funzione updateCrosshair per mobile
    const originalUpdateCrosshair = updateCrosshair;
    updateCrosshair = function() {
        // Chiama la funzione originale
        originalUpdateCrosshair();

        // Gestisci indicatori mobile
        if (hintElement) {
            if (isNearSwitch) {
                hintElement.textContent = 'Tocca F per l\'interruttore';
                hintElement.style.display = 'block';
            } else {
                hintElement.style.display = 'none';
            }
        }
    };

    logger.log('Indicatori interazione mobile configurati');
}

// Funzione per mostrare messaggi mobile temporanei
function showMobileMessage(message, duration = 2000) {
    // Rimuovi messaggio esistente se presente
    const existingMsg = document.getElementById('temp-mobile-msg');
    if (existingMsg) {
        existingMsg.remove();
    }

    // Crea nuovo messaggio
    const msgElement = document.createElement('div');
    msgElement.id = 'temp-mobile-msg';
    msgElement.textContent = message;
    msgElement.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.9);
        color: #ff4d4d;
        padding: 15px 25px;
        border-radius: 10px;
        border: 2px solid #ff4d4d;
        font-weight: bold;
        text-align: center;
        z-index: 10000;
        pointer-events: none;
        animation: fadeInOut 0.3s ease;
        font-size: 16px;
        box-shadow: 0 0 20px rgba(255, 77, 77, 0.5);
    `;

    document.body.appendChild(msgElement);

    // Rimuovi dopo la durata specificata
    setTimeout(() => {
        if (msgElement.parentNode) {
            msgElement.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => msgElement.remove(), 300);
        }
    }, duration);
}

// Aggiorna la funzione toggleSpectatorMode per gestire i controlli mobile
const originalToggleSpectatorMode = toggleSpectatorMode;
toggleSpectatorMode = function() {
    originalToggleSpectatorMode();

    // Mostra/nascondi controlli spettatore su mobile
    const spectatorControls = document.getElementById('spectator-controls');
    if (spectatorControls) {
        spectatorControls.classList.toggle('active', isSpectatorMode);
    }

    // Mostra messaggio esplicativo su mobile
    if (isSpectatorMode) {
        showMobileMessage('Modalità Spettatore: Usa Q/E per salire/scendere', 3000);
    } else {
        showMobileMessage('Modalità Normale ripristinata', 1500);
    }
};

// CSS per le animazioni dei messaggi temporanei
const mobileAnimationStyles = document.createElement('style');
mobileAnimationStyles.textContent = `
    @keyframes fadeInOut {
        from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        to { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
    }
`;
document.head.appendChild(mobileAnimationStyles);

// Funzione per ridimensionare il canvas
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    logger.log(`Canvas ridimensionato: ${canvas.width}x${canvas.height}`);
}

// Funzione migliorata per il debug degli shader
function compileShader(gl, source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const shaderType = type === gl.VERTEX_SHADER ? 'VERTEX' : 'FRAGMENT';
        const error = gl.getShaderInfoLog(shader);

        // Log dettagliato per il debug
        logger.log(`ERRORE ${shaderType} SHADER:`);
        logger.log(error);

        // Mostra le righe del codice sorgente per il debug
        const lines = source.split('\n');
        lines.forEach((line, index) => {
            const lineNum = index + 1;
            if (lineNum >= 105 && lineNum <= 115) { // Intorno alla riga dell'errore
                logger.log(`${lineNum}: ${line}`);
            }
        });

        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

// Inizializzazione degli shader
function initShaders() {
    try {
        // Shader principali per gli oggetti
        const vertexShaderSource = document.getElementById('vertex-shader').textContent;
        const fragmentShaderSource = document.getElementById('fragment-shader').textContent;

        // Usa la nuova funzione di compilazione con debug migliorato
        const vertexShader = compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
        const fragmentShader = compileShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);

        if (!vertexShader || !fragmentShader) {
            logger.log('ERRORE CRITICO: Compilazione shader fallita.');
            return false;
        }

        // Crea e collega il program
        program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            logger.log('Errore nel link del program: ' + gl.getProgramInfoLog(program));
            return false;
        }

        // Shader per lo skybox
        const skyboxVertexShaderSource = document.getElementById('skybox-vertex-shader').textContent;
        const skyboxFragmentShaderSource = document.getElementById('skybox-fragment-shader').textContent;

        // Compila vertex shader per skybox
        const skyboxVertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(skyboxVertexShader, skyboxVertexShaderSource);
        gl.compileShader(skyboxVertexShader);

        if (!gl.getShaderParameter(skyboxVertexShader, gl.COMPILE_STATUS)) {
            logger.log('Errore nel vertex shader skybox: ' + gl.getShaderInfoLog(skyboxVertexShader));
            return false;
        }

        // Compila fragment shader per skybox
        const skyboxFragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(skyboxFragmentShader, skyboxFragmentShaderSource);
        gl.compileShader(skyboxFragmentShader);

        if (!gl.getShaderParameter(skyboxFragmentShader, gl.COMPILE_STATUS)) {
            logger.log('Errore nel fragment shader skybox: ' + gl.getShaderInfoLog(skyboxFragmentShader));
            return false;
        }

        // Crea e collega il program dello skybox
        skyboxProgram = gl.createProgram();
        gl.attachShader(skyboxProgram, skyboxVertexShader);
        gl.attachShader(skyboxProgram, skyboxFragmentShader);
        gl.linkProgram(skyboxProgram);

        if (!gl.getProgramParameter(skyboxProgram, gl.LINK_STATUS)) {
            logger.log('Errore nel link del program skybox: ' + gl.getProgramInfoLog(skyboxProgram));
            return false;
        }

        // Shader per le shadow map
        const shadowVertexShaderSource = document.getElementById('shadow-vertex-shader').textContent;
        const shadowFragmentShaderSource = document.getElementById('shadow-fragment-shader').textContent;

        // Compila vertex shader per le ombre
        const shadowVertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(shadowVertexShader, shadowVertexShaderSource);
        gl.compileShader(shadowVertexShader);

        if (!gl.getShaderParameter(shadowVertexShader, gl.COMPILE_STATUS)) {
            logger.log('Errore nel vertex shader ombre: ' + gl.getShaderInfoLog(shadowVertexShader));
            return false;
        }

        // Compila fragment shader per le ombre
        const shadowFragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(shadowFragmentShader, shadowFragmentShaderSource);
        gl.compileShader(shadowFragmentShader);

        if (!gl.getShaderParameter(shadowFragmentShader, gl.COMPILE_STATUS)) {
            logger.log('Errore nel fragment shader ombre: ' + gl.getShaderInfoLog(shadowFragmentShader));
            return false;
        }

        // Crea e collega il program per le ombre
        shadowProgram = gl.createProgram();
        gl.attachShader(shadowProgram, shadowVertexShader);
        gl.attachShader(shadowProgram, shadowFragmentShader);
        gl.linkProgram(shadowProgram);

        if (!gl.getProgramParameter(shadowProgram, gl.LINK_STATUS)) {
            logger.log('Errore nel link del program ombre: ' + gl.getProgramInfoLog(shadowProgram));
            return false;
        }

        logger.log('Shader compilati con successo');
        return true;
    } catch (error) {
        logger.log('Errore critico nella compilazione degli shader: ' + error);
        return false;
    }
}

// Inizializzazione dei suoni
function initSounds() {
    sounds.ambient.loop = true;
    sounds.ambient.volume = 0.5;

    sounds.flicker.volume = 0.7;
    sounds.footsteps.volume = 0.3;

    sounds.intro.loop = true;
    sounds.intro.volume = 0.6;

    sounds.startGame.volume = 0.6;
    sounds.laLaLa.volume = 0.5;
    sounds.demonLaugh.volume = 0.5;

    logger.log('Suoni inizializzati');
}

// Carica risorse (texture e modelli)
function loadResources() {
    logger.log('Caricamento risorse...');

    // Solo il blocco del pulsante START (resto uguale a prima)
    const startButton = document.getElementById('start-button');
    if (startButton) {
        startButton.disabled = true;
        startButton.style.opacity = '0.5';
        startButton.style.cursor = 'not-allowed';
        startButton.textContent = 'CARICAMENTO...';
        
        // Riattiva dopo 3 secondi (tempo ragionevole)
        setTimeout(() => {
            startButton.disabled = false;
            startButton.style.opacity = '1';
            startButton.style.cursor = 'pointer';
            startButton.textContent = 'START';
        }, 3000);
    }

    // CARICAMENTO ORIGINALE - SEMPLICE E PARALLELO
    
    // Carica texture di base
    loadTexture('textures/wall.jpg', 'wall');
    loadTexture('textures/wood.jpg', 'floor');
    loadTexture('textures/wood.jpg', 'ceiling');
    loadTexture('textures/glass.png', 'glass');
    loadTexture('textures/author_photo.jpg', 'author_photo');

    // Crea la texture bianca ruvida per l'interruttore
    createRoughWhiteTexture();

    // Carica texture per gli oggetti
    loadTexture('textures/Skull.jpg', 'skull_texture');
    loadTexture('textures/wood-clock.png', 'wood_texture');
    loadTexture('textures/clock.png', 'clock_texture');
    loadTexture('textures/DiffuseMap_LOD0.png', 'doll_texture');
    loadTexture('textures/Doll_Doll_BaseColor.png', 'doll_base_texture');

    // Carica texture della skybox
    loadSkyboxTextures();

    // Texture dell'interruttore
    loadTexture('textures/switch/Albedo.png', 'switch_albedo');
    loadTexture('textures/switch/normal.png', 'switch_normal');
    loadTexture('textures/switch/roughness.png', 'switch_roughness');

    // Carica modelli OBJ
    loadOBJModel('models/12140_Skull_v3_L2.obj', 'models/12140_Skull_v3_L2.mtl', 'skull');
    loadOBJModel('models/kurumaisu.unity_1.obj', 'models/kurumaisu.unity_1.mtl', 'chair');
    loadOBJModel('models/UnsavedScene_1.obj', 'models/UnsavedScene_1.mtl', 'wheelie');
    loadOBJModel('models/doll.obj', 'models/doll.mtl', 'doll');
    loadOBJModel('models/light_switch.obj', 'models/light_switch.mtl', 'switch', function() {
        logger.log('Modello interruttore caricato');
        if (models['switch']) {
            models['switch'].texture = 'switch_white';
        }
    });
    loadOBJModel('models/lamp.obj', 'models/lamp.mtl', 'lamp');
    loadOBJModel('models/pendent-clock.obj', 'models/pendent-clock.mtl', 'clock');

    // Inizializza shadow map dopo un breve delay
    setTimeout(function() {
        initShadowMap();
    }, 500);

    logger.log('Risorse in caricamento...');
}

// Funzione per caricare texture
function loadTexture(url, name) {
    const texture = gl.createTexture();
    const image = new Image();

    image.onload = function() {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        // Verifica se le dimensioni sono potenze di 2
        const isPowerOf2Width = (image.width & (image.width - 1)) === 0;
        const isPowerOf2Height = (image.height & (image.height - 1)) === 0;

        if (isPowerOf2Width && isPowerOf2Height) {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.generateMipmap(gl.TEXTURE_2D);
        } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.bindTexture(gl.TEXTURE_2D, null);

        textures[name] = texture;
        logger.log(`Texture caricata: ${name}`);
    };

    // Gestione errori SEMPLICE
    image.onerror = function() {
        logger.log(`Errore caricamento: ${url}`);
        // Crea texture magenta come fallback
        const fallbackTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, fallbackTexture);
        const pixel = new Uint8Array([255, 0, 255, 255]); // Magenta
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        textures[name] = fallbackTexture;
    };

    image.src = url;
}

// Carica le texture dello skybox
function loadSkyboxTextures() {
    // Nomi dei file della cubemap
    const faces = [
        'textures/skybox/px.png', // Right
        'textures/skybox/nx.png', // Left
        'textures/skybox/py.png', // Top
        'textures/skybox/ny.png', // Bottom
        'textures/skybox/pz.png', // Front
        'textures/skybox/nz.png'  // Back
    ];

    // Crea la cubemap texture
    const skyboxTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTexture);

    // Imposta parametri della texture
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Carica ciascuna faccia della cubemap
    let imagesLoaded = 0;
    const targets = [
        gl.TEXTURE_CUBE_MAP_POSITIVE_X,
        gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
        gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
        gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
        gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
        gl.TEXTURE_CUBE_MAP_NEGATIVE_Z
    ];

    for (let i = 0; i < faces.length; i++) {
        const img = new Image();
        img.onload = function() {
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTexture);
            gl.texImage2D(targets[i], 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            imagesLoaded++;
            if (imagesLoaded === 6) {
                textures['skybox'] = skyboxTexture;
                logger.log('Texture della skybox caricate');
                createSkybox();
            }
        };
        
        // Gestione errori semplice
        img.onerror = function() {
            logger.log(`Errore caricamento skybox: ${faces[i]}`);
            imagesLoaded++;
            if (imagesLoaded === 6) {
                textures['skybox'] = skyboxTexture;
                logger.log('Skybox caricata con errori');
                createSkybox();
            }
        };
        
        img.src = faces[i];
    }
}

// Crea lo skybox
function createSkybox() {
    // Definisci i vertici del cubo
    const skyboxVertices = [
        // Posizioni          
        -1.0, 1.0, -1.0,
        -1.0, -1.0, -1.0,
        1.0, -1.0, -1.0,
        1.0, -1.0, -1.0,
        1.0, 1.0, -1.0,
        -1.0, 1.0, -1.0,

        -1.0, -1.0, 1.0,
        -1.0, -1.0, -1.0,
        -1.0, 1.0, -1.0,
        -1.0, 1.0, -1.0,
        -1.0, 1.0, 1.0,
        -1.0, -1.0, 1.0,

        1.0, -1.0, -1.0,
        1.0, -1.0, 1.0,
        1.0, 1.0, 1.0,
        1.0, 1.0, 1.0,
        1.0, 1.0, -1.0,
        1.0, -1.0, -1.0,

        -1.0, -1.0, 1.0,
        -1.0, 1.0, 1.0,
        1.0, 1.0, 1.0,
        1.0, 1.0, 1.0,
        1.0, -1.0, 1.0,
        -1.0, -1.0, 1.0,

        -1.0, 1.0, -1.0,
        1.0, 1.0, -1.0,
        1.0, 1.0, 1.0,
        1.0, 1.0, 1.0,
        -1.0, 1.0, 1.0,
        -1.0, 1.0, -1.0,

        -1.0, -1.0, -1.0,
        -1.0, -1.0, 1.0,
        1.0, -1.0, -1.0,
        1.0, -1.0, -1.0,
        -1.0, -1.0, 1.0,
        1.0, -1.0, 1.0
    ];

    // Crea e configura lo skybox nel tuo oggetto 'models'
    models['skybox'] = {
        vertices: skyboxVertices,
        position: [0, 0, 0],
        scale: [200, 200, 200] // Scala grande per avvolgere la scena
    };

    logger.log('Skybox creato');
}

// Carica modello OBJ
function loadOBJModel(objUrl, mtlUrl, name, successCallback) {
    logger.log(`Caricamento modello: ${name}`);

    // Controlla se i percorsi sono definiti
    if (!objUrl) {
        logger.log(`ERRORE: Percorso OBJ non specificato per ${name}`);
        return;
    }

    // Usa jQuery per caricare il file OBJ come testo
    $.ajax({
        url: objUrl,
        dataType: 'text',
        success: function(objData) {
            try {
                // Verifica che objData non sia vuoto
                if (!objData || objData.trim() === "") {
                    logger.log(`ERRORE: File OBJ vuoto per ${name}`);
                    return;
                }

                // Prova a parsare il modello OBJ usando il parser personalizzato
                const model = parseOBJ(objData);

                // Verifica che il modello abbia vertici validi
                if (!model || !model.vertices || model.vertices.length === 0) {
                    logger.log(`ERRORE: Il modello ${name} non ha vertici validi`);
                    return;
                }

                // Memorizza il modello elaborato
                models[name] = {
                    vertices: model.vertices,
                    normals: model.normals,
                    texcoords: model.texcoords,
                    position: [0, 0, 0],
                    rotation: [0, 0, 0],
                    scale: [1, 1, 1],
                    texture: 'wall' // Texture predefinita
                };

                // Posiziona i modelli in base al nome
                positionModel(name);

                logger.log(`Modello caricato: ${name} (${model.vertices.length / 3} vertici)`);

                // Chiama il callback di successo se fornito
                if (successCallback) successCallback();
            } catch (error) {
                logger.log(`Errore durante il parsing di ${name}: ${error.message}`);
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            logger.log(`Errore durante il caricamento di ${name}: ${textStatus} - ${errorThrown}`);
        }
    });
}

// Modifica alla funzione che crea la texture per lo switch
function createRoughWhiteTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Colore di base bianco-avorio invecchiato (meno bianco, più giallastro)
    ctx.fillStyle = '#e8e2d0';
    ctx.fillRect(0, 0, 256, 256);

    // Aggiungi effetto di ruvidità con piccole macchie casuali più scure
    for (let i = 0; i < 5000; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const radius = Math.random() * 1.5 + 0.5;
        const opacity = Math.random() * 0.25; // Opacità maggiore per un effetto più evidente

        ctx.fillStyle = `rgba(80, 70, 50, ${opacity})`;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    // Aggiungi qualche segno di usura
    for (let i = 0; i < 20; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const width = Math.random() * 30 + 5;
        const height = Math.random() * 3 + 1;
        const angle = Math.random() * Math.PI;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillStyle = 'rgba(40, 30, 20, 0.2)';
        ctx.fillRect(-width / 2, -height / 2, width, height);
        ctx.restore();
    }

    // Aggiungi un bordo nero più marcato
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, 250, 250);

    // Crea la texture WebGL
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);

    // Imposta i parametri della texture
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);

    // Rilascia il binding
    gl.bindTexture(gl.TEXTURE_2D, null);

    textures['switch_white'] = texture;
    logger.log('Texture invecchiata con bordo nero creata per lo switch');

    return texture;
}

// Posiziona i modelli nella scena in base al tipo
function positionModel(name) {
    if (!models[name]) return;

    if (name === 'skull') {
        // Nascondi l'originale
        models[name].position = [100, 100, 100]; // Fuori dalla scena
        models[name].scale = [0.05, 0.05, 0.05]; // Scala dell'originale

        // RIPRISTINO: Posiziona i teschi con le TUE coordinate originali
        for (let i = 0; i < 5; i++) {
            const angle = i * Math.PI * 0.4;
            const distance = roomSize * 0.8;
            const x = Math.sin(angle) * distance;
            const z = Math.cos(angle) * distance;

            // RIPRISTINO: Y originale
            const y = -5; // TUA coordinata originale

            const cloneName = `skull_${i}`;
            models[cloneName] = Object.assign({}, models[name]);
            models[cloneName].position = [x, y, z];
            models[cloneName].rotation = [0, -angle + Math.PI, 0];
            models[cloneName].scale = [0.03, 0.03, 0.03];

            models[cloneName].texture = 'skull_texture';
        }
    } else if (name === 'chair') {
        // RIPRISTINO: TUE coordinate originali
        models[name].position = [3, -7.1, -3]; // TUE coordinate originali
        models[name].rotation = [0, Math.PI / 4, 0];
        models[name].scale = [0.15, 0.15, 0.15];
        models[name].texture = 'wood_texture';

        // Aggiungi una seconda sedia
        const cloneName = `${name}_2`;
        models[cloneName] = Object.assign({}, models[name]);
        models[cloneName].position = [-3, -7.1, 2]; // TUE coordinate originali
        models[cloneName].rotation = [0, -Math.PI / 3, 0];
    } else if (name === 'doll') {
        // RIPRISTINO: TUE coordinate originali
        const randomX = (Math.random() * 2 - 1) * (roomSize * 0.6);
        const randomZ = (Math.random() * 2 - 1) * (roomSize * 0.6);
        models[name].position = [randomX, -5, randomZ];
        models[name].rotation = [0, Math.random() * Math.PI * 2, 0];
        models[name].scale = [0.9, 0.9, 0.9];
        models[name].texture = 'doll_base_texture';

        // Aggiorna la posizione della bambola per l'interazione
        dollPosition = [randomX, 0, randomZ]; // Questa rimane per l'interazione
        logger.log(`Bambola posizionata a: [${randomX}, -5, ${randomZ}] (modello), interazione: [${randomX}, 0, ${randomZ}]`);
    } else if (name === 'lamp') {
        models[name].position = [0, -0.01, 0];
        models[name].rotation = [Math.PI / 2, 0, 0];
        models[name].scale = [2.5, 2.5, 2.5];
        models[name].isEmissive = true;

        lightPosition = [0, 4, 0];

        const lampLightColor = createColorTexture([1.0, 0.95, 0.8, 1.0], 1.5);
        textures['lampLight'] = lampLightColor;
        models[name].texture = 'lampLight';
    } else if (name === 'switch' || name === 'lightSwitch') {
        const switchX = roomSize - 0.01; // Parete destra
        const switchY = -2.0; // Altezza media
        const switchZ = 0; // Centro della stanza lungo Z

        models[name].position = [switchX, switchY, switchZ];
        models[name].rotation = [0, -Math.PI / 2, 0];
        models[name].scale = [4.95, 4.95, 4.95];
        models[name].isEmissive = true;
        models[name].texture = 'switch_white';

        // Aggiorna la posizione per l'interazione
        switchPosition = [switchX, switchY, switchZ];
    } else if (name === 'wheelie') {
        models[name].position = [5, -6.7, 4];
        models[name].rotation = [0, 0, 0];
        models[name].scale = [0.15, 0.15, 0.15];
        models[name].texture = 'wood_texture';
    } else if (name === 'clock') {
        // RIPRISTINO: TUE coordinate originali
        models[name].position = [4, -5.5, -roomSize + 0.8];
        models[name].rotation = [0, -Math.PI / 2, 0];
        models[name].scale = [0.6, 0.6, 0.6];
        models[name].texture = 'clock_texture';
    }
}

// Funzione per aggiornare la posizione interattiva dello switch
function updateSwitchPosition() {
    // Ottieni la posizione effettiva dello switch dal modello
    let actualSwitchPos;

    if (models['switch']) {
        actualSwitchPos = models['switch'].position;
    } else if (models['fallbackSwitch']) {
        actualSwitchPos = models['fallbackSwitch'].position;
    } else if (models['lightSwitch']) {
        actualSwitchPos = models['lightSwitch'].position;
    } else {
        // Posizione di default se non troviamo nessun modello
        actualSwitchPos = [roomSize - 0.3, -2.0, 0]; // Parete destra
    }

    // Aggiorna la posizione per l'interazione
    switchPosition = [...actualSwitchPos]; // Copia i valori

    logger.log(`Area interattiva dell'interruttore aggiornata a: [${switchPosition}]`);
}

// Funzione di parsing OBJ
function parseOBJ(text) {
    // Arrays per memorizzare i dati grezzi dal file
    const rawPositions = [];
    const rawTexcoords = [];
    const rawNormals = [];

    // Arrays finali di output
    const vertices = [];
    const texcoords = [];
    const normals = [];

    // Analizziamo il file riga per riga
    const lines = text.split('\n');

    // Flag per tracciare se il file contiene normali e coordinate texture
    let hasNormals = false;
    let hasTexcoords = false;

    logger.log(`Parsing OBJ: ${lines.length} linee`);

    // Prima passiamo attraverso tutte le linee per raccogliere dati grezzi
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('#')) continue;

        const parts = trimmedLine.split(/\s+/);
        const command = parts[0].toLowerCase();

        if (command === 'v') {
            // Vertex position (x, y, z)
            rawPositions.push(
                parseFloat(parts[1]),
                parseFloat(parts[2]),
                parseFloat(parts[3])
            );
        } else if (command === 'vt') {
            // Texture coordinate (u, v)
            rawTexcoords.push(
                parseFloat(parts[1]),
                parseFloat(parts[2] || 0)
            );
            hasTexcoords = true;
        } else if (command === 'vn') {
            // Vertex normal (x, y, z)
            rawNormals.push(
                parseFloat(parts[1]),
                parseFloat(parts[2]),
                parseFloat(parts[3])
            );
            hasNormals = true;
        } else if (command === 'f') {
            // Face definition - convert to triangles
            processFace(parts.slice(1), rawPositions, rawTexcoords, rawNormals,
                vertices, texcoords, normals, hasTexcoords, hasNormals);
        }
    }

    logger.log(`OBJ Parsing completato: ${vertices.length / 3} vertici`);

    if (vertices.length === 0) {
        logger.log("ERRORE: Nessun vertice trovato nel file OBJ");
        return null;
    }

    // Verifica e genera normali se mancanti
    if (normals.length === 0 || normals.length !== vertices.length) {
        logger.log("Generazione normali...");
        generateNormals(vertices, normals);
    }

    // Verifica e genera coordinate texture se mancanti
    if (texcoords.length === 0 || texcoords.length !== vertices.length / 3 * 2) {
        logger.log("Generazione coordinate texture...");
        generateTexcoords(vertices, texcoords);
    }

    return {
        vertices: vertices,
        normals: normals,
        texcoords: texcoords
    };
}

// Funzione per processare una faccia e convertirla in triangoli
function processFace(faceVertices, positions, texcoords, normals,
    verticesOut, texcoordsOut, normalsOut, hasTexcoords, hasNormals) {
    // Triangolazione di facce con più di 3 vertici (fan triangulation)
    for (let i = 1; i < faceVertices.length - 1; i++) {
        // Per ogni triangolo nella faccia (0,i,i+1)
        const vertices = [faceVertices[0], faceVertices[i], faceVertices[i + 1]];

        // Processa ciascun vertice
        for (const vertex of vertices) {
            const indices = vertex.split('/');

            // Vertex position (gli indici in OBJ sono 1-based)
            const posIndex = parseInt(indices[0]) - 1;
            if (posIndex >= 0 && posIndex * 3 < positions.length) {
                verticesOut.push(
                    positions[posIndex * 3],
                    positions[posIndex * 3 + 1],
                    positions[posIndex * 3 + 2]
                );
            } else {
                // Usa una posizione di default se indice invalido
                verticesOut.push(0, 0, 0);
                logger.log(`Avviso: Indice di vertice invalido ${posIndex}`);
            }

            // Texture coordinate (se disponibile)
            if (hasTexcoords && indices.length > 1 && indices[1] !== '') {
                const texIndex = parseInt(indices[1]) - 1;
                if (texIndex >= 0 && texIndex * 2 < texcoords.length) {
                    texcoordsOut.push(
                        texcoords[texIndex * 2],
                        texcoords[texIndex * 2 + 1]
                    );
                } else {
                    // Usa coordinate texture di default
                    texcoordsOut.push(0, 0);
                }
            } else if (hasTexcoords) {
                // Usa coordinate texture di default
                texcoordsOut.push(0, 0);
            }

            // Normal (se disponibile)
            if (hasNormals && indices.length > 2) {
                const normIndex = parseInt(indices[2]) - 1;
                if (normIndex >= 0 && normIndex * 3 < normals.length) {
                    normalsOut.push(
                        normals[normIndex * 3],
                        normals[normIndex * 3 + 1],
                        normals[normIndex * 3 + 2]
                    );
                } else {
                    // Usa una normale di default (verso l'alto)
                    normalsOut.push(0, 1, 0);
                }
            } else if (hasNormals) {
                // Usa una normale di default
                normalsOut.push(0, 1, 0);
            }
        }
    }
}

// Funzione per generare normali quando non sono fornite nel file OBJ
function generateNormals(vertices, normalsOut) {
    // Svuota l'array delle normali
    normalsOut.length = 0;

    // Normali temporanee per ciascun vertice
    const tempNormals = new Array(vertices.length).fill(0);

    // Calcola le normali per ogni triangolo
    for (let i = 0; i < vertices.length; i += 9) {
        // Ottieni i tre vertici del triangolo
        const v0 = [vertices[i], vertices[i + 1], vertices[i + 2]];
        const v1 = [vertices[i + 3], vertices[i + 4], vertices[i + 5]];
        const v2 = [vertices[i + 6], vertices[i + 7], vertices[i + 8]];

        // Calcola vettori dei lati
        const edge1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
        const edge2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];

        // Calcola la normale con il prodotto vettoriale
        const normal = [
            edge1[1] * edge2[2] - edge1[2] * edge2[1],
            edge1[2] * edge2[0] - edge1[0] * edge2[2],
            edge1[0] * edge2[1] - edge1[1] * edge2[0]
        ];

        // Normalizza
        const length = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]);
        if (length > 0) {
            normal[0] /= length;
            normal[1] /= length;
            normal[2] /= length;
        }

        // Aggiungi questa normale a tutti i vertici del triangolo
        for (let j = 0; j < 3; j++) {
            const idx = i + j * 3;
            tempNormals[idx] = normal[0];
            tempNormals[idx + 1] = normal[1];
            tempNormals[idx + 2] = normal[2];
        }
    }

    // Copia le normali nell'array di output
    for (let i = 0; i < tempNormals.length; i++) {
        normalsOut.push(tempNormals[i]);
    }
}

// Funzione per generare coordinate texture quando non sono fornite
function generateTexcoords(vertices, texcoordsOut) {
    // Svuota l'array delle coordinate texture
    texcoordsOut.length = 0;

    // Per ogni vertice, genera coordinate texture basate sulla posizione
    for (let i = 0; i < vertices.length; i += 3) {
        // Usa x e z come coordinate texture (semplice proiezione planare)
        // Normalizza nell'intervallo [0,1]
        const x = (vertices[i] + 10) / 20; // Assumendo che il modello sia dentro [-10, 10]
        const z = (vertices[i + 2] + 10) / 20;

        texcoordsOut.push(x, z);
    }
}

// Funzione per attivare/disattivare la modalità spettatore
function toggleSpectatorMode() {
    isSpectatorMode = !isSpectatorMode;

    if (isSpectatorMode) {
        // Salva la posizione originale
        camera.originalPosition = [...camera.position];
        camera.originalRotation = [...camera.rotation];

        // Aumenta la velocità
        camera.speed = 0.2;

        // Mostra le istruzioni per la modalità spettatore
        const spectatorInstructions = document.createElement('div');
        spectatorInstructions.id = 'spectator-instructions';
        spectatorInstructions.textContent = 'Modalità Spettatore: Q = Scendi, E = Sali';
        spectatorInstructions.style.position = 'absolute';
        spectatorInstructions.style.bottom = '50px';
        spectatorInstructions.style.left = '50%';
        spectatorInstructions.style.transform = 'translateX(-50%)';
        spectatorInstructions.style.backgroundColor = 'rgba(0,0,0,0.7)';
        spectatorInstructions.style.color = '#ff4d4d';
        spectatorInstructions.style.padding = '10px';
        spectatorInstructions.style.borderRadius = '5px';
        spectatorInstructions.style.zIndex = '10';
        document.body.appendChild(spectatorInstructions);

        logger.log('Modalità spettatore attivata (collisioni disabilitate, usa Q per scendere ed E per salire)');
    } else {
        // Ripristina velocità normale
        camera.speed = 0.05;

        // Ritorna alla posizione originale
        camera.position = [...camera.originalPosition];
        camera.rotation = [...camera.originalRotation];

        // Rimuovi le istruzioni
        const spectatorInstructions = document.getElementById('spectator-instructions');
        if (spectatorInstructions) {
            document.body.removeChild(spectatorInstructions);
        }

        logger.log('Modalità spettatore disattivata');
    }

    // Mostra/nascondi controlli spettatore su mobile
    const spectatorControls = document.getElementById('spectator-controls');
    if (spectatorControls) {
        spectatorControls.classList.toggle('active', isSpectatorMode);
    }

    // Mostra messaggio esplicativo su mobile
    if (isSpectatorMode) {
        showMobileMessage('Modalità Spettatore: Usa Q/E per salire/scendere', 3000);
    } else {
        showMobileMessage('Modalità Normale ripristinata', 1500);
    }
}

// Funzione per attivare/disattivare lo sprint
function toggleSprint(active) {
    // Se in modalità spettatore, ignora lo sprint
    if (isSpectatorMode) return;

    isSprinting = active;

    // Modifica la velocità del giocatore in base allo stato dello sprint
    if (isSprinting) {
        playerSpeed = 0.1; // Velocità di sprint
    } else {
        playerSpeed = 0.05; // Velocità normale
    }

    logger.log(`Sprint ${isSprinting ? 'attivato' : 'disattivato'}`);
}

// Funzione per creare una texture con un colore solido e una intensità specifica
function createColorTexture(color, intensity = 1.0) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Applica l'intensità ai componenti RGB, mantenendo l'alpha invariato
    const adjustedColor = [
        Math.min(color[0] * intensity, 1.0),
        Math.min(color[1] * intensity, 1.0),
        Math.min(color[2] * intensity, 1.0),
        color[3]
    ];

    // Crea un pixel con il colore specificato
    const pixel = new Uint8Array([
        Math.floor(adjustedColor[0] * 255),
        Math.floor(adjustedColor[1] * 255),
        Math.floor(adjustedColor[2] * 255),
        Math.floor(adjustedColor[3] * 255)
    ]);

    // Carica un pixel di colore come texture
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

    // Non serve mipmap per un colore solido
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    return texture;
}

// Imposto la posizione della luce
function initializeProperLighting() {
    lightPosition = [0, 4, 0];
}

// Helper per creare elementi stanza mancanti
function createMissingRoomElement(elementName) {
    if (elementName === 'floor') {
        models['floor'] = {
            vertices: [
                -roomSize, 0, -roomSize,
                roomSize, 0, roomSize,
                roomSize, 0, -roomSize,
                -roomSize, 0, -roomSize,
                -roomSize, 0, roomSize,
                roomSize, 0, roomSize
            ],
            normals: [
                0, 1, 0,
                0, 1, 0,
                0, 1, 0,
                0, 1, 0,
                0, 1, 0,
                0, 1, 0
            ],
            texcoords: [0, 0, 2, 0, 2, 2, 0, 0, 2, 2, 0, 2],
            position: [0, 0, 0],
            scale: [1, 1, 1],
            texture: 'floor'
        };
    }
}

// Helper per riparare normali
function fixRoomElementNormals(elementName) {
    const element = models[elementName];
    if (!element || !element.vertices) return;

    const vertexCount = element.vertices.length / 3;
    element.normals = [];

    // Assegna normali appropriate
    if (elementName === 'floor') {
        for (let i = 0; i < vertexCount; i++) {
            element.normals.push(0, 1, 0); // Verso l'alto
        }
    } else if (elementName === 'ceiling') {
        for (let i = 0; i < vertexCount; i++) {
            element.normals.push(0, -1, 0); // Verso il basso
        }
    }
}