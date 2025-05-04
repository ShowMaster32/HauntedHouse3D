// Funzione per aggiornata per gestire i controlli del movimento
function updateCamera(dt) {
    // Skip update if panel is open
    if (isPanelOpen || !gameStarted) return;

    // Velocità base
    const speed = playerSpeed * (dt || 0.016) * 60;

    // Reset velocità orizzontale
    playerVelocity[0] = 0;
    playerVelocity[2] = 0;

    // Ottieni i vettori di direzione
    const forward = getForwardVector();
    const right = getSideVector();

    // Movimento avanti/indietro
    if (keys['KeyW']) {
        playerVelocity[0] -= forward[0] * speed;
        playerVelocity[2] -= forward[2] * speed;
    }
    if (keys['KeyS']) {
        playerVelocity[0] += forward[0] * speed;
        playerVelocity[2] += forward[2] * speed;
    }

    // Movimento laterale
    if (keys['KeyA']) {
        playerVelocity[0] -= right[0] * speed;
        playerVelocity[2] -= right[2] * speed;
    }
    if (keys['KeyD']) {
        playerVelocity[0] += right[0] * speed;
        playerVelocity[2] += right[2] * speed;
    }

    // Modalità spettatore: movimento verticale
    if (isSpectatorMode) {
        if (keys['KeyQ']) {
            playerVelocity[1] = speed; // Scendi
        } else if (keys['KeyE']) {
            playerVelocity[1] = -speed; // Sali
        } else {
            playerVelocity[1] = 0;
        }
    }

    // Aggiorna la posizione della camera usando direttamente la velocità
    camera.position[0] += playerVelocity[0];
    camera.position[1] += playerVelocity[1];
    camera.position[2] += playerVelocity[2];

    // Collisioni con le pareti
    checkWallCollisions();
}

// Verifica collisioni con i muri
function checkWallCollisions() {
    // Se in modalità spettatore, ignora le collisioni
    if (isSpectatorMode) return;

    const playerRadius = 0.5;

    // Limiti della stanza
    const minX = -roomSize + playerRadius;
    const maxX = roomSize - playerRadius;
    const minZ = -roomSize + playerRadius;
    const maxZ = roomSize - playerRadius;

    // Limiti verticali (pavimento e soffitto)
    const maxY = camera.defaultHeight; // Pavimento
    const minY = -roomHeight + 0.5; // Soffitto

    // Collisioni X
    if (camera.position[0] < minX) {
        camera.position[0] = minX;
        playerVelocity[0] = 0;
    } else if (camera.position[0] > maxX) {
        camera.position[0] = maxX;
        playerVelocity[0] = 0;
    }

    // Collisioni Z
    if (camera.position[2] < minZ) {
        camera.position[2] = minZ;
        playerVelocity[2] = 0;
    } else if (camera.position[2] > maxZ) {
        camera.position[2] = maxZ;
        playerVelocity[2] = 0;
    }

    // Collisioni Y (soffitto e pavimento)
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

// Funzione per gestire il movimento del mouse con inversione verticale corretta
function handleMouseMove(e) {
    if (!mouseLocked || isPanelOpen) return;

    // Sensibilità costante
    const sensitivity = 0.002;

    // La rotazione orizzontale (intorno all'asse Y)
    camera.rotation[1] += e.movementX * sensitivity;

    // Rotazione verticale (intorno all'asse X) con inversione corretta
    camera.rotation[0] += e.movementY * sensitivity;

    // Limita la rotazione verticale per evitare capovolgimenti
    camera.rotation[0] = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, camera.rotation[0]));
}

// Funzione aggiornata per creare la matrice di vista
function createViewMatrix() {
    // La direzione di vista deve essere coerente con le rotazioni
    // Yaw (rotazione orizzontale) e Pitch (rotazione verticale)
    const yaw = camera.rotation[1];
    const pitch = camera.rotation[0];

    // Calcola il punto di destinazione
    const dirX = Math.sin(yaw) * Math.cos(pitch);
    const dirY = Math.sin(pitch);
    const dirZ = Math.cos(yaw) * Math.cos(pitch);

    // Punto verso cui la camera sta guardando
    const lookX = camera.position[0] + dirX;
    const lookY = camera.position[1] + dirY;
    const lookZ = camera.position[2] + dirZ;

    // Crea la matrice vista
    return m4.lookAt(
        camera.position, // Posizione della camera
        [lookX, lookY, lookZ], // Punto verso cui guarda
        [0, 1, 0] // "Up" vector (sempre verticale)
    );
}

// Funzione per aggiornare il crosshair in base alla vicinanza a oggetti interattivi
function updateCrosshair() {
    const interactableObjects = [
        // Definisci oggetti interattivi con posizione e raggio
        {
            position: switchPosition, // Usiamo esattamente la posizione dello switch
            radius: 3.0, // Aumentato per facilitare l'interazione
            name: 'switch'
        }
    ];

    // Reset dello stato di vicinanza all'interruttore
    isNearSwitch = false;

    // Verifica se la camera è vicina a qualche oggetto interattivo
    let nearInteractable = false;

    for (const obj of interactableObjects) {
        const dx = camera.position[0] - obj.position[0];
        const dy = camera.position[1] - obj.position[1];
        const dz = camera.position[2] - obj.position[2];
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance < obj.radius) {
            nearInteractable = true;

            // Se è vicino all'interruttore, mostra le istruzioni e aggiorna lo stato
            if (obj.name === 'switch') {
                document.getElementById('instructions').style.visibility = 'visible';
                isNearSwitch = true;
                logger.log(`Giocatore vicino all'interruttore a distanza: ${distance.toFixed(2)}`);
            }

            break;
        } else {
            // Assicurati che le istruzioni siano nascoste se non siamo vicini
            document.getElementById('instructions').style.visibility = 'hidden';
        }
    }

    // Cambia il colore del crosshair in base alla vicinanza
    if (nearInteractable) {
        document.getElementById('crosshair').style.backgroundImage = "url('images/crosshair-selection.png')";
    } else {
        document.getElementById('crosshair').style.backgroundImage = "url('images/crosshair.png')";
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
    // Clear canvas
    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Skip rendering if game not started
    if (!gameStarted) return;

    // Enable depth testing
    gl.enable(gl.DEPTH_TEST);

    // Crea matrice vista
    const viewMatrix = createViewMatrix();

    // Calcola matrice di proiezione
    const aspect = canvas.width / canvas.height;
    const fov = Math.PI / 4; // 45 gradi, un valore standard
    const projectionMatrix = m4.perspective(fov, aspect, 0.1, 100);

    // Renderizza skybox
    renderSkybox(viewMatrix, projectionMatrix);

    // Usa il programma principale per il resto della scena
    gl.useProgram(program);

    // Verifica che program sia valido prima di ottenere uniform locations
    if (!program) {
        logger.log("ERRORE: Programma shader non valido");
        return;
    }

    // Ottieni tutte le locazioni uniform per gli shader
    const u_modelLoc = gl.getUniformLocation(program, 'u_model');
    const u_viewLoc = gl.getUniformLocation(program, 'u_view');
    const u_projectionLoc = gl.getUniformLocation(program, 'u_projection');
    const u_lightPosLoc = gl.getUniformLocation(program, 'u_lightPos');
    const u_viewPosLoc = gl.getUniformLocation(program, 'u_viewPos');
    const u_useTextureLoc = gl.getUniformLocation(program, 'u_useTexture');
    const u_textureLoc = gl.getUniformLocation(program, 'u_texture');
    const u_isEmissiveLoc = gl.getUniformLocation(program, 'u_isEmissive');
    const u_externalLightColorLoc = gl.getUniformLocation(program, 'u_externalLightColor');
    const u_externalLightIntensityLoc = gl.getUniformLocation(program, 'u_externalLightIntensity');
    const u_normalMatrixLoc = gl.getUniformLocation(program, 'u_normalMatrix');

    // Passa le opzioni di rendering
    gl.uniform1i(gl.getUniformLocation(program, 'u_shadows'), renderOptions.shadows);
    gl.uniform1i(gl.getUniformLocation(program, 'u_reflections'), renderOptions.reflections);
    gl.uniform1i(gl.getUniformLocation(program, 'u_lightOn'), isLightOn);
    gl.uniform1i(gl.getUniformLocation(program, 'u_externalLightOn'), isExternalLightOn);
    gl.uniform1i(gl.getUniformLocation(program, 'u_advancedRendering'), renderOptions.advancedRendering);

    // Imposta i valori per la luce esterna
    gl.uniform3f(u_externalLightColorLoc, 0.6, 0.6, 1.0); // Luce bluastra
    gl.uniform1f(u_externalLightIntensityLoc, 0.1); // Intensità bassa

    // Imposta la posizione della luce e della camera
    gl.uniform3fv(u_lightPosLoc, lightPosition);
    gl.uniform3fv(u_viewPosLoc, camera.position);

    // Passa matrici view e projection agli shader
    gl.uniformMatrix4fv(u_viewLoc, false, viewMatrix);
    gl.uniformMatrix4fv(u_projectionLoc, false, projectionMatrix);

    // Array per raccogliere oggetti trasparenti
    const transparentObjects = [];

    // Renderizza prima tutti gli oggetti non trasparenti
    for (const modelName in models) {
        if (modelName === 'skybox') continue; // Skybox già renderizzato

        const model = models[modelName];
        if (!model || !model.vertices || model.vertices.length === 0) continue;

        // Salta oggetti trasparenti e raccoglili per il rendering successivo
        if (model.isTransparent) {
            // Calcola distanza dalla camera per ordinare gli oggetti trasparenti
            let modelX = model.position[0];
            let modelY = model.position[1];
            let modelZ = model.position[2];
            const dx = camera.position[0] - modelX;
            const dy = camera.position[1] - modelY;
            const dz = camera.position[2] - modelZ;
            
            transparentObjects.push({
                name: modelName,
                distanceToCamera: dx*dx + dy*dy + dz*dz
            });
            
            continue;
        }

        // Crea matrice modello
        let modelMatrix = m4.identity();

        // Applica traslazione se specificata
        if (model.position) {
            modelMatrix = m4.translate(
                modelMatrix,
                model.position[0],
                model.position[1],
                model.position[2]
            );
        }

        // Applica rotazione se specificata
        if (model.rotation) {
            modelMatrix = m4.xRotate(modelMatrix, model.rotation[0]);
            modelMatrix = m4.yRotate(modelMatrix, model.rotation[1]);
            modelMatrix = m4.zRotate(modelMatrix, model.rotation[2]);
        }

        // Applica scala se specificata
        if (model.scale) {
            modelMatrix = m4.scale(
                modelMatrix,
                model.scale[0],
                model.scale[1],
                model.scale[2]
            );
        }

        // Passa la matrice modello allo shader
        gl.uniformMatrix4fv(u_modelLoc, false, modelMatrix);

        // Calcola la matrice normale (inversa trasposta della matrice modello)
        const normalMatrix = m4.transpose(m4.inverse(modelMatrix));
        gl.uniformMatrix4fv(u_normalMatrixLoc, false, normalMatrix);

        // Flag per oggetti emissivi
        gl.uniform1i(u_isEmissiveLoc, model.isEmissive || false);

        // Configura texture se specificata
        if (model.texture && textures[model.texture]) {
            gl.uniform1i(u_useTextureLoc, 1);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, textures[model.texture]);
            gl.uniform1i(u_textureLoc, 0);
        } else {
            gl.uniform1i(u_useTextureLoc, 0);
        }

        // Configura i buffer per questo modello
        setBuffersForModel(model);

        // Disegna il modello
        gl.drawArrays(gl.TRIANGLES, 0, model.vertices.length / 3);
    }

    // Ordina gli oggetti trasparenti dal più lontano al più vicino
    transparentObjects.sort((a, b) => {
        return b.distanceToCamera - a.distanceToCamera;
    });

    // Poi renderizza gli oggetti trasparenti
    if (transparentObjects.length > 0) {
        // Abilita il blending per la trasparenza
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); // Questa è la chiave per la trasparenza corretta
        gl.depthMask(false); // Disattiva scrittura sul depth buffer per oggetti trasparenti

        // Itera sugli oggetti trasparenti in ordine di distanza
        for (const obj of transparentObjects) {
            const model = models[obj.name];

            // Crea matrice modello
            let modelMatrix = m4.identity();

            // Applica traslazione se specificata
            if (model.position) {
                modelMatrix = m4.translate(
                    modelMatrix,
                    model.position[0],
                    model.position[1],
                    model.position[2]
                );
            }

            // Applica rotazione se specificata
            if (model.rotation) {
                modelMatrix = m4.xRotate(modelMatrix, model.rotation[0]);
                modelMatrix = m4.yRotate(modelMatrix, model.rotation[1]);
                modelMatrix = m4.zRotate(modelMatrix, model.rotation[2]);
            }

            // Applica scala se specificata
            if (model.scale) {
                modelMatrix = m4.scale(
                    modelMatrix,
                    model.scale[0],
                    model.scale[1],
                    model.scale[2]
                );
            }

            // Passa la matrice modello allo shader
            gl.uniformMatrix4fv(u_modelLoc, false, modelMatrix);

            // Calcola la matrice normale (inversa trasposta della matrice modello)
            const normalMatrix = m4.transpose(m4.inverse(modelMatrix));
            gl.uniformMatrix4fv(u_normalMatrixLoc, false, normalMatrix);

            // Flag per oggetti emissivi
            gl.uniform1i(u_isEmissiveLoc, model.isEmissive || false);

            // Configura texture se specificata
            if (model.texture && textures[model.texture]) {
                gl.uniform1i(u_useTextureLoc, 1);
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, textures[model.texture]);
                gl.uniform1i(u_textureLoc, 0);
            } else {
                gl.uniform1i(u_useTextureLoc, 0);
            }

            // Configura i buffer per questo modello
            setBuffersForModel(model);

            // Disegna il modello
            gl.drawArrays(gl.TRIANGLES, 0, model.vertices.length / 3);
        }

        // Ripristina le impostazioni del rendering
        gl.depthMask(true);  // Riabilita scrittura nel depth buffer
        gl.disable(gl.BLEND);
    }
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
    if (!skyboxProgram || !textures['skybox'] || !models['skybox']) return;

    // Usa il programma shader per lo skybox
    gl.useProgram(skyboxProgram);

    // Verifica che skyboxProgram sia valido
    if (!skyboxProgram) {
        logger.log("ERRORE: Programma shader skybox non valido");
        return;
    }

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
        logger.log("ERRORE: Modello senza vertici");
        return;
    }

    // Ottieni le locazioni degli attributi dello shader
    const positionLoc = gl.getAttribLocation(program, 'a_position');
    const normalLoc = gl.getAttribLocation(program, 'a_normal');
    const texcoordLoc = gl.getAttribLocation(program, 'a_texcoord');

    // Crea e configura il buffer per i vertici
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.vertices), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);

    // Gestione delle normali
    if (model.normals && model.normals.length === model.vertices.length) {
        // Se il modello ha normali valide della lunghezza corretta, usale
        const normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.normals), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(normalLoc);
        gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
    } else {
        // Altrimenti crea normali di default (verso l'alto)
        const defaultNormals = [];
        for (let i = 0; i < model.vertices.length / 3; i++) {
            defaultNormals.push(0, 1, 0); // Normale default verso l'alto
        }
        const normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(defaultNormals), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(normalLoc);
        gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
    }

    // Gestione delle coordinate texture
    if (model.texcoords && model.texcoords.length === (model.vertices.length / 3) * 2) {
        // Se il modello ha coordinate texture valide della lunghezza corretta, usale
        const texcoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.texcoords), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(texcoordLoc);
        gl.vertexAttribPointer(texcoordLoc, 2, gl.FLOAT, false, 0, 0);
    } else {
        // Altrimenti crea coordinate texture di default
        const defaultTexcoords = [];
        for (let i = 0; i < model.vertices.length / 3; i++) {
            defaultTexcoords.push(0, 0); // Coordinate UV di default (0,0)
        }
        const texcoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(defaultTexcoords), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(texcoordLoc);
        gl.vertexAttribPointer(texcoordLoc, 2, gl.FLOAT, false, 0, 0);
    }
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

// Verifica collisioni con i muri
function checkWallCollisions() {
    // Se in modalità spettatore, ignora le collisioni
    if (isSpectatorMode) return;

    const playerRadius = 0.5;

    // Limiti della stanza
    const minX = -roomSize + playerRadius;
    const maxX = roomSize - playerRadius;
    const minZ = -roomSize + playerRadius;
    const maxZ = roomSize - playerRadius;

    // Limiti verticali (pavimento e soffitto)
    const maxY = camera.defaultHeight; // Pavimento
    const minY = -roomHeight + 0.5; // Soffitto

    // Collisioni X
    if (camera.position[0] < minX) {
        camera.position[0] = minX;
        playerVelocity[0] = 0;
    } else if (camera.position[0] > maxX) {
        camera.position[0] = maxX;
        playerVelocity[0] = 0;
    }

    // Collisioni Z
    if (camera.position[2] < minZ) {
        camera.position[2] = minZ;
        playerVelocity[2] = 0;
    } else if (camera.position[2] > maxZ) {
        camera.position[2] = maxZ;
        playerVelocity[2] = 0;
    }

    // Collisioni Y (soffitto e pavimento)
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

// Funzione per gestire il movimento del mouse con inversione verticale corretta
function handleMouseMove(e) {
    if (!mouseLocked || isPanelOpen) return;

    // Sensibilità costante
    const sensitivity = 0.002;

    // La rotazione orizzontale (intorno all'asse Y)
    camera.rotation[1] += e.movementX * sensitivity;

    // Rotazione verticale (intorno all'asse X) con inversione corretta
    camera.rotation[0] += e.movementY * sensitivity;

    // Limita la rotazione verticale per evitare capovolgimenti
    camera.rotation[0] = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, camera.rotation[0]));
}

// Funzione aggiornata per creare la matrice di vista
function createViewMatrix() {
    // La direzione di vista deve essere coerente con le rotazioni
    // Yaw (rotazione orizzontale) e Pitch (rotazione verticale)
    const yaw = camera.rotation[1];
    const pitch = camera.rotation[0];

    // Calcola il punto di destinazione
    const dirX = Math.sin(yaw) * Math.cos(pitch);
    const dirY = Math.sin(pitch);
    const dirZ = Math.cos(yaw) * Math.cos(pitch);

    // Punto verso cui la camera sta guardando
    const lookX = camera.position[0] + dirX;
    const lookY = camera.position[1] + dirY;
    const lookZ = camera.position[2] + dirZ;

    // Crea la matrice vista
    return m4.lookAt(
        camera.position, // Posizione della camera
        [lookX, lookY, lookZ], // Punto verso cui guarda
        [0, 1, 0] // "Up" vector (sempre verticale)
    );
}

// Funzione per aggiornare il crosshair in base alla vicinanza a oggetti interattivi
function updateCrosshair() {
    const interactableObjects = [
        // Definisci oggetti interattivi con posizione e raggio
        {
            position: switchPosition,
            radius: 2.5,
            name: 'switch'
        } // Raggio aumentato per facilitare l'interazione
    ];

    // Reset dello stato di vicinanza all'interruttore
    isNearSwitch = false;

    // Verifica se la camera è vicina a qualche oggetto interattivo
    let nearInteractable = false;

    for (const obj of interactableObjects) {
        const dx = camera.position[0] - obj.position[0];
        const dy = camera.position[1] - obj.position[1];
        const dz = camera.position[2] - obj.position[2];
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance < obj.radius) {
            nearInteractable = true;

            // Se è vicino all'interruttore, mostra le istruzioni e aggiorna lo stato
            if (obj.name === 'switch') {
                document.getElementById('instructions').style.visibility = 'visible';
                isNearSwitch = true;
            }

            break;
        } else {
            // Assicurati che le istruzioni siano nascoste se non siamo vicini
            document.getElementById('instructions').style.visibility = 'hidden';
        }
    }

    // Cambia il colore del crosshair in base alla vicinanza
    if (nearInteractable) {
        document.getElementById('crosshair').style.backgroundImage = "url('images/crosshair-selection.png')";
    } else {
        document.getElementById('crosshair').style.backgroundImage = "url('images/crosshair.png')";
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

function createSwitch() {
    // Se il modello OBJ è già stato caricato, non creare il fallback
    if (models['switch']) {
        logger.log("Modello switch OBJ già caricato, fallback non necessario");
        return;
    }

    // Dimensioni dell'interruttore
    const switchSize = 0.4;

    // Vertici per un semplice parallelepipedo
    const switchVertices = [
        // Fronte
        -switchSize, -switchSize, switchSize,
        switchSize, -switchSize, switchSize,
        switchSize, switchSize, switchSize,
        -switchSize, -switchSize, switchSize,
        switchSize, switchSize, switchSize,
        -switchSize, switchSize, switchSize,

        // Retro
        -switchSize, -switchSize, -switchSize,
        -switchSize, switchSize, -switchSize,
        switchSize, switchSize, -switchSize,
        -switchSize, -switchSize, -switchSize,
        switchSize, switchSize, -switchSize,
        switchSize, -switchSize, -switchSize,

        // Alto
        -switchSize, switchSize, -switchSize,
        -switchSize, switchSize, switchSize,
        switchSize, switchSize, switchSize,
        -switchSize, switchSize, -switchSize,
        switchSize, switchSize, switchSize,
        switchSize, switchSize, -switchSize,

        // Basso
        -switchSize, -switchSize, -switchSize,
        switchSize, -switchSize, -switchSize,
        switchSize, -switchSize, switchSize,
        -switchSize, -switchSize, -switchSize,
        switchSize, -switchSize, switchSize,
        -switchSize, -switchSize, switchSize,

        // Destra
        switchSize, -switchSize, -switchSize,
        switchSize, switchSize, -switchSize,
        switchSize, switchSize, switchSize,
        switchSize, -switchSize, -switchSize,
        switchSize, switchSize, switchSize,
        switchSize, -switchSize, switchSize,

        // Sinistra
        -switchSize, -switchSize, -switchSize,
        -switchSize, -switchSize, switchSize,
        -switchSize, switchSize, switchSize,
        -switchSize, -switchSize, -switchSize,
        -switchSize, switchSize, switchSize,
        -switchSize, switchSize, -switchSize
    ];

    // Normali standard per un cubo
    const switchNormals = [
        // Fronte
        0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
        // Retro
        0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
        // Alto
        0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
        // Basso
        0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
        // Destra
        1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
        // Sinistra
        -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0
    ];

    // Coordinate texture di base
    const switchTexcoords = [];
    for (let i = 0; i < 6; i++) {
        switchTexcoords.push(
            0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1
        );
    }

    // Crea un colore rosso brillante per l'interruttore
    const switchColor = createColorTexture([1.0, 0.2, 0.2, 1.0]);
    textures['switchColor'] = switchColor;

    // Posiziona l'interruttore sulla parete destra
    const switchX = roomSize - 0.3; // Vicino alla parete destra
    const switchY = -1.7; // Altezza occhi
    const switchZ = 0; // Centro della stanza lungo Z

    // Aggiungi l'interruttore ai modelli
    models['fallbackSwitch'] = {
        vertices: switchVertices,
        normals: switchNormals,
        texcoords: switchTexcoords,
        position: [switchX, switchY, switchZ],
        rotation: [0, -Math.PI / 2, 0], // Rivolto verso l'interno
        scale: [1, 1, 1],
        texture: 'switchColor',
        isEmissive: true
    };

    // Crea l'indicatore arancione accanto all'interruttore principale
    const indicatorLight = createColorTexture([1.0, 0.5, 0.0, 1.0]); // Arancione
    textures['indicatorLight'] = indicatorLight;

    // Aggiungi l'indicatore ACCANTO all'interruttore
    models['switchIndicator'] = {
        vertices: switchVertices,
        normals: switchNormals,
        texcoords: switchTexcoords,
        position: [switchX, switchY, switchZ - 0.8], // Accanto all'interruttore
        rotation: [0, 0, 0],
        scale: [0.7, 0.7, 0.7], // Più piccolo dell'interruttore principale
        texture: 'indicatorLight',
        isEmissive: true
    };

    // Aggiorna anche la posizione per l'interazione
    switchPosition = [switchX, switchY, switchZ];

    logger.log(`Interruttore fallback posizionato a: [${switchPosition}]`);
    logger.log(`Indicatore arancione posizionato a: [${switchX}, ${switchY}, ${switchZ - 0.8}]`);
}

// Funzione per creare una lampada fallback se lamp.obj non si carica
function createFallbackLamp() {
    // Verifica se la lampada è già stata caricata
    if (models['lamp']) {
        return;
    }

    logger.log("Creazione lampada fallback...");

    // Crea una texture luminosa per la lampada
    const lampLightColor = createColorTexture([1.0, 0.95, 0.8, 1.0]); // Bianco caldo
    textures['lampLight'] = lampLightColor;

    // Crea un modello semplice di lampada (semisfera)
    const segments = 16;
    const rings = 8;
    const radius = 0.5;

    const vertices = [];
    const normals = [];
    const texcoords = [];

    // Crea una semisfera rivolta verso il basso
    for (let ring = 0; ring <= rings; ring++) {
        const phi = (ring / rings) * Math.PI / 2; // Solo metà sfera (0 a PI/2)
        const cosPhi = Math.cos(phi);
        const sinPhi = Math.sin(phi);

        for (let segment = 0; segment <= segments; segment++) {
            const theta = (segment / segments) * 2 * Math.PI;
            const cosTheta = Math.cos(theta);
            const sinTheta = Math.sin(theta);

            // Vertice sulla semisfera
            const x = cosTheta * sinPhi * radius;
            const y = cosPhi * radius; // Y verso l'alto
            const z = sinTheta * sinPhi * radius;

            vertices.push(x, -y, z); // Negativo Y per puntare verso il basso

            // Normale (verso l'esterno)
            normals.push(x / radius, -y / radius, z / radius);

            // Coordinate texture
            texcoords.push(segment / segments, ring / rings);
        }
    }

    // Crea indici per i triangoli
    const indices = [];
    for (let ring = 0; ring < rings; ring++) {
        for (let segment = 0; segment < segments; segment++) {
            // Indici dei 4 vertici del quad
            const a = ring * (segments + 1) + segment;
            const b = ring * (segments + 1) + segment + 1;
            const c = (ring + 1) * (segments + 1) + segment;
            const d = (ring + 1) * (segments + 1) + segment + 1;

            // Due triangoli per formare un quad
            indices.push(a, c, b);
            indices.push(b, c, d);
        }
    }

    // Converti indici in vertici, normali e texture coords
    const indexedVertices = [];
    const indexedNormals = [];
    const indexedTexcoords = [];

    for (let i = 0; i < indices.length; i++) {
        const index = indices[i];
        indexedVertices.push(
            vertices[index * 3],
            vertices[index * 3 + 1],
            vertices[index * 3 + 2]
        );
        indexedNormals.push(
            normals[index * 3],
            normals[index * 3 + 1],
            normals[index * 3 + 2]
        );
        indexedTexcoords.push(
            texcoords[index * 2],
            texcoords[index * 2 + 1]
        );
    }

    // Aggiungi la lampada ai modelli
    models['lampFallback'] = {
        vertices: indexedVertices,
        normals: indexedNormals,
        texcoords: indexedTexcoords,
        position: [0, -roomHeight + 0.1, 0], // Attaccata al soffitto
        rotation: [Math.PI, 0, 0], // Ruota di 180° attorno all'asse X
        scale: [1, 1, 1],
        texture: 'lampLight',
        isEmissive: true
    };

    logger.log(`Lampada fallback creata e posizionata sul soffitto a [0, ${-roomHeight + 0.1}, 0]`);
}

// Funzione per aggiungere la luce al soffitto
function addCeilingLight() {
    // Verifica se la lampada è già stata caricata
    if (models['lamp']) {
        logger.log('Lampada già caricata, non è necessario creare un backup');
        return;
    }

    // Crea un modello semplice per la lampada (un cilindro)
    const segments = 12;
    const radius = 0.5;
    const height = 0.8;

    const lampVertices = [];
    const lampNormals = [];
    const lampTexcoords = [];

    // Crea la parte superiore (attaccata al soffitto)
    for (let i = 0; i < segments; i++) {
        const angle1 = (i / segments) * Math.PI * 2;
        const angle2 = ((i + 1) / segments) * Math.PI * 2;

        const x1 = Math.cos(angle1) * radius;
        const z1 = Math.sin(angle1) * radius;
        const x2 = Math.cos(angle2) * radius;
        const z2 = Math.sin(angle2) * radius;

        // Aggiungi un triangolo (dal centro alla circonferenza)
        lampVertices.push(
            0, 0, 0, // Centro superiore
            x1, 0, z1, // Punto 1 sulla circonferenza
            x2, 0, z2 // Punto 2 sulla circonferenza
        );

        // Normali verso l'alto
        lampNormals.push(
            0, 1, 0,
            0, 1, 0,
            0, 1, 0
        );

        // Coordinate texture
        lampTexcoords.push(
            0.5, 0.5,
            0.5 + x1 / (2 * radius), 0.5 + z1 / (2 * radius),
            0.5 + x2 / (2 * radius), 0.5 + z2 / (2 * radius)
        );
    }

    // Crea la parte laterale
    for (let i = 0; i < segments; i++) {
        const angle1 = (i / segments) * Math.PI * 2;
        const angle2 = ((i + 1) / segments) * Math.PI * 2;

        const x1 = Math.cos(angle1) * radius;
        const z1 = Math.sin(angle1) * radius;
        const x2 = Math.cos(angle2) * radius;
        const z2 = Math.sin(angle2) * radius;

        // Aggiungi due triangoli per formare un quad
        lampVertices.push(
            x1, 0, z1, // Punto 1 in alto
            x1, height, z1, // Punto 1 in basso
            x2, 0, z2, // Punto 2 in alto

            x2, 0, z2, // Punto 2 in alto
            x1, height, z1, // Punto 1 in basso
            x2, height, z2 // Punto 2 in basso
        );

        // Calcola le normali verso l'esterno
        const nx1 = x1 / radius;
        const nz1 = z1 / radius;
        const nx2 = x2 / radius;
        const nz2 = z2 / radius;

        lampNormals.push(
            nx1, 0, nz1,
            nx1, 0, nz1,
            nx2, 0, nz2,

            nx2, 0, nz2,
            nx1, 0, nz1,
            nx2, 0, nz2
        );

        // Coordinate texture
        const u1 = i / segments;
        const u2 = (i + 1) / segments;

        lampTexcoords.push(
            u1, 0,
            u1, 1,
            u2, 0,

            u2, 0,
            u1, 1,
            u2, 1
        );
    }

    // Crea la parte inferiore (diffusore luce)
    for (let i = 0; i < segments; i++) {
        const angle1 = (i / segments) * Math.PI * 2;
        const angle2 = ((i + 1) / segments) * Math.PI * 2;

        const x1 = Math.cos(angle1) * radius;
        const z1 = Math.sin(angle1) * radius;
        const x2 = Math.cos(angle2) * radius;
        const z2 = Math.sin(angle2) * radius;

        // Aggiungi un triangolo (dalla circonferenza al centro)
        lampVertices.push(
            x1, height, z1, // Punto 1 sulla circonferenza
            0, height, 0, // Centro inferiore
            x2, height, z2 // Punto 2 sulla circonferenza
        );

        // Normali verso il basso
        lampNormals.push(
            0, -1, 0,
            0, -1, 0,
            0, -1, 0
        );

        // Coordinate texture
        lampTexcoords.push(
            0.5 + x1 / (2 * radius), 0.5 + z1 / (2 * radius),
            0.5, 0.5,
            0.5 + x2 / (2 * radius), 0.5 + z2 / (2 * radius)
        );
    }

    // Crea una texture luminosa per la lampada
    const lampLightColor = createColorTexture([1.0, 0.95, 0.8, 1.0]); // Bianco caldo
    textures['lampLight'] = lampLightColor;

    // Aggiungi la lampada ai modelli
    models['ceilingLight'] = {
        vertices: lampVertices,
        normals: lampNormals,
        texcoords: lampTexcoords,
        position: [0, -roomHeight + 0.1, 0], // Attaccata al soffitto
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        texture: 'lampLight',
        isEmissive: true // Questo oggetto emette luce
    };

    // Imposta la posizione della luce per l'illuminazione
    lightPosition = [0, -roomHeight + 1.0, 0]; // 1 metro sotto il soffitto

    logger.log('Lampada di backup creata e posizionata sul soffitto');
}

// Crea una stanza semplice con aperture per le finestre
function createSimpleRoom() {
    logger.log("Creazione stanza con aperture per finestre...");
    
    // Definisci le dimensioni delle finestre
    const windowWidth = 4;
    const windowHeight = 2.5;
    const frameWidth = 0.2;
    
    // Pavimento (a Y=0)
    models['floor'] = {
        vertices: [
            -roomSize, 0, -roomSize,
            roomSize, 0, -roomSize,
            roomSize, 0, roomSize,
            -roomSize, 0, -roomSize,
            roomSize, 0, roomSize,
            -roomSize, 0, roomSize
        ],
        normals: [
            0, 1, 0,
            0, 1, 0,
            0, 1, 0,
            0, 1, 0,
            0, 1, 0,
            0, 1, 0
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
        texture: 'floor'
    };

    // Soffitto (a Y=-roomHeight)
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
            0, -1, 0,
            0, -1, 0,
            0, -1, 0,
            0, -1, 0,
            0, -1, 0,
            0, -1, 0
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
        texture: 'ceiling'
    };

    // Definisci posizioni finestre
    const windowPositions = [
        { x: 0, y: -1.3, wall: 'front' }, 
        { x: 0, y: -1.3, wall: 'back' },  
        { x: 4, y: -1.3, wall: 'right' }, 
        { x: -4, y: -1.3, wall: 'left' }  
    ];

    // Crea pareti con aperture per le finestre
    // Parete frontale
    createWallWithHoles('frontWall', 'front', windowPositions);
    
    // Parete posteriore
    createWallWithHoles('backWall', 'back', windowPositions);
    
    // Parete sinistra
    createWallWithHoles('leftWall', 'left', windowPositions);
    
    // Parete destra
    createWallWithHoles('rightWall', 'right', windowPositions);
    
    // Aggiungi le cornici delle finestre
    addWindowOpenings();

    logger.log('Stanza con finestre creata');
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
    let normalX = 0, normalY = 0, normalZ = 0;
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
            minX = windowX - windowWidth/2;
            maxX = windowX + windowWidth/2;
            minZ = wallType === 'front' ? -roomSize : roomSize;
            maxZ = minZ;
        } else {
            minZ = windowX - windowWidth/2;
            maxZ = windowX + windowWidth/2;
            minX = wallType === 'left' ? -roomSize : roomSize;
            maxX = minX;
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
        
        // Aggiungi le normali per tutti i vertici
        for (let i = 0; i < vertices.length / 3; i++) {
            normals.push(normalX, normalY, normalZ);
        }
        
        // Aggiungi coordinate texture approssimative
        // (questa è una versione semplificata, potresti voler calcolare coordinate più precise)
        for (let i = 0; i < vertices.length; i += 9) {
            // Calcola coordinate texture basate sulla posizione dei vertici
            for (let j = 0; j < 3; j++) {
                const vIdx = i + j*3;
                let u, v;
                
                if (wallType === 'front' || wallType === 'back') {
                    // Per le pareti frontali/posteriori, usa X e Y
                    u = (vertices[vIdx] + roomSize) / (2 * roomSize); // Normalizza X da -roomSize a roomSize
                    v = -vertices[vIdx+1] / roomHeight;  // Normalizza Y (invertito perché Y è negativo)
                } else {
                    // Per le pareti laterali, usa Z e Y
                    u = (vertices[vIdx+2] + roomSize) / (2 * roomSize); // Normalizza Z da -roomSize a roomSize
                    v = -vertices[vIdx+1] / roomHeight;  // Normalizza Y (invertito)
                }
                
                texcoords.push(u, v);
            }
        }
    }
    
    // Crea il modello della parete
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
    switch(wallType) {
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
        flatVertices.push(vertices[i+1][0], vertices[i+1][1], vertices[i+1][2]);
        flatVertices.push(vertices[i+2][0], vertices[i+2][1], vertices[i+2][2]);
    }
    
    // Crea normali e coordinate texture
    for (let i = 0; i < vertices.length; i += 3) {
        // Aggiungi normali per i tre vertici del triangolo
        for (let j = 0; j < 3; j++) {
            normals.push(normalVector[0], normalVector[1], normalVector[2]);
        }
        
        // Calcola coordinate texture approssimative
        const triVerts = [vertices[i], vertices[i+1], vertices[i+2]];
        
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
    const glassOffset = 0.01;   // Offset per il vetro
    const frameOffset = 0.02;   // Offset maggiore per le cornici (più avanti)
    
    // Definisci le posizioni delle finestre
    const windows = [
        { x: 0, y: 3.0, wall: 'front' },  // Finestra sulla parete frontale
        { x: 0, y: 3.0, wall: 'back' },   // Finestra sulla parete posteriore
        { x: 4, y: 3.0, wall: 'right' },  // Finestra sulla parete destra
        { x: -4, y: 3.0, wall: 'left' }   // Finestra sulla parete sinistra
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
        
        switch(window.wall) {
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
                -windowWidth/2, y, glassOffset,
                windowWidth/2, y, glassOffset,
                windowWidth/2, y - windowHeight, glassOffset,
                -windowWidth/2, y, glassOffset,
                windowWidth/2, y - windowHeight, glassOffset,
                -windowWidth/2, y - windowHeight, glassOffset
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
                models[`windowGlass_${index}`].normals[i*3+2] = 1; // Normale in direzione +Z
            } else if (window.wall === 'back') {
                models[`windowGlass_${index}`].normals[i*3+2] = -1; // Normale in direzione -Z
            } else if (window.wall === 'left') {
                models[`windowGlass_${index}`].normals[i*3] = 1; // Normale in direzione +X
            } else if (window.wall === 'right') {
                models[`windowGlass_${index}`].normals[i*3] = -1; // Normale in direzione -X
            }
        }
        
        // Ora aggiungiamo le cornici
        
        // Cornice superiore
        models[`windowFrameTop_${index}`] = {
            vertices: [
                -windowWidth/2 - frameWidth, y + frameWidth, frameOffset,
                windowWidth/2 + frameWidth, y + frameWidth, frameOffset,
                windowWidth/2 + frameWidth, y, frameOffset,
                -windowWidth/2 - frameWidth, y + frameWidth, frameOffset,
                windowWidth/2 + frameWidth, y, frameOffset,
                -windowWidth/2 - frameWidth, y, frameOffset
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
                -windowWidth/2 - frameWidth, y - windowHeight, frameOffset,
                windowWidth/2 + frameWidth, y - windowHeight, frameOffset,
                windowWidth/2 + frameWidth, y - windowHeight - frameWidth, frameOffset,
                -windowWidth/2 - frameWidth, y - windowHeight, frameOffset,
                windowWidth/2 + frameWidth, y - windowHeight - frameWidth, frameOffset,
                -windowWidth/2 - frameWidth, y - windowHeight - frameWidth, frameOffset
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
                -windowWidth/2 - frameWidth, y + frameWidth, frameOffset,
                -windowWidth/2, y + frameWidth, frameOffset,
                -windowWidth/2, y - windowHeight - frameWidth, frameOffset,
                -windowWidth/2 - frameWidth, y + frameWidth, frameOffset,
                -windowWidth/2, y - windowHeight - frameWidth, frameOffset,
                -windowWidth/2 - frameWidth, y - windowHeight - frameWidth, frameOffset
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
                windowWidth/2, y + frameWidth, frameOffset,
                windowWidth/2 + frameWidth, y + frameWidth, frameOffset,
                windowWidth/2 + frameWidth, y - windowHeight - frameWidth, frameOffset,
                windowWidth/2, y + frameWidth, frameOffset,
                windowWidth/2 + frameWidth, y - windowHeight - frameWidth, frameOffset,
                windowWidth/2, y - windowHeight - frameWidth, frameOffset
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
                -windowWidth/2, y - windowHeight/2 + frameWidth/2, frameOffset,
                windowWidth/2, y - windowHeight/2 + frameWidth/2, frameOffset,
                windowWidth/2, y - windowHeight/2 - frameWidth/2, frameOffset,
                -windowWidth/2, y - windowHeight/2 + frameWidth/2, frameOffset,
                windowWidth/2, y - windowHeight/2 - frameWidth/2, frameOffset,
                -windowWidth/2, y - windowHeight/2 - frameWidth/2, frameOffset
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
    const windows = [
        { x: 0, y: -1.3, wall: 'front' },
        { x: 0, y: -1.3, wall: 'back' },
        { x: 4, y: -1.3, wall: 'right' },
        { x: -4, y: -1.3, wall: 'left' }
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
        
        switch(window.wall) {
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
        
        // Crea un array di normali in base alla direzione della parete
        const normals = new Array(18).fill(0);
        for (let i = 0; i < 6; i++) {
            if (window.wall === 'front') {
                normals[i*3+2] = 1; // Normale in direzione +Z
            } else if (window.wall === 'back') {
                normals[i*3+2] = -1; // Normale in direzione -Z
            } else if (window.wall === 'left') {
                normals[i*3] = 1; // Normale in direzione +X
            } else if (window.wall === 'right') {
                normals[i*3] = -1; // Normale in direzione -X
            }
        }
        
        // Cornice superiore
        models[`windowFrameTop_${index}`] = {
            vertices: [
                -windowWidth/2 - frameWidth, y + frameWidth, frameOffset,
                windowWidth/2 + frameWidth, y + frameWidth, frameOffset,
                windowWidth/2 + frameWidth, y, frameOffset,
                -windowWidth/2 - frameWidth, y + frameWidth, frameOffset,
                windowWidth/2 + frameWidth, y, frameOffset,
                -windowWidth/2 - frameWidth, y, frameOffset
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
                -windowWidth/2 - frameWidth, y - windowHeight, frameOffset,
                windowWidth/2 + frameWidth, y - windowHeight, frameOffset,
                windowWidth/2 + frameWidth, y - windowHeight - frameWidth, frameOffset,
                -windowWidth/2 - frameWidth, y - windowHeight, frameOffset,
                windowWidth/2 + frameWidth, y - windowHeight - frameWidth, frameOffset,
                -windowWidth/2 - frameWidth, y - windowHeight - frameWidth, frameOffset
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
                -windowWidth/2 - frameWidth, y + frameWidth, frameOffset,
                -windowWidth/2, y + frameWidth, frameOffset,
                -windowWidth/2, y - windowHeight - frameWidth, frameOffset,
                -windowWidth/2 - frameWidth, y + frameWidth, frameOffset,
                -windowWidth/2, y - windowHeight - frameWidth, frameOffset,
                -windowWidth/2 - frameWidth, y - windowHeight - frameWidth, frameOffset
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
                windowWidth/2, y + frameWidth, frameOffset,
                windowWidth/2 + frameWidth, y + frameWidth, frameOffset,
                windowWidth/2 + frameWidth, y - windowHeight - frameWidth, frameOffset,
                windowWidth/2, y + frameWidth, frameOffset,
                windowWidth/2 + frameWidth, y - windowHeight - frameWidth, frameOffset,
                windowWidth/2, y - windowHeight - frameWidth, frameOffset
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
                -windowWidth/2, y - windowHeight/2 + frameWidth/2, frameOffset,
                windowWidth/2, y - windowHeight/2 + frameWidth/2, frameOffset,
                windowWidth/2, y - windowHeight/2 - frameWidth/2, frameOffset,
                -windowWidth/2, y - windowHeight/2 + frameWidth/2, frameOffset,
                windowWidth/2, y - windowHeight/2 - frameWidth/2, frameOffset,
                -windowWidth/2, y - windowHeight/2 - frameWidth/2, frameOffset
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
                -frameWidth/2, y + frameWidth, frameOffset,
                frameWidth/2, y + frameWidth, frameOffset,
                frameWidth/2, y - windowHeight - frameWidth, frameOffset,
                -frameWidth/2, y + frameWidth, frameOffset,
                frameWidth/2, y - windowHeight - frameWidth, frameOffset,
                -frameWidth/2, y - windowHeight - frameWidth, frameOffset
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
    position: [0, 1.7, 5],
    rotation: [0, Math.PI],
    speed: 0.1,
    defaultHeight: 1.7,
    originalPosition: [0, 1.7, 5],
    originalRotation: [0, Math.PI]
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
let playerSpeed = 0.15;
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
            }, { passive: false });
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

    // Aggiorna il crosshair
    updateCrosshair();

    // Mostra le coordinate della camera
    updateCameraCoordinates();

    // Controlla la vicinanza alla bambola
    checkDollProximity();
}

// Gestione tasti speciali
function handleSpecialKeys(e) {
    if (e.code === 'KeyP') {
        togglePanel();
    } else if (e.code === 'KeyF') {
        // Verifica che siamo vicini all'interruttore prima di attivare la funzione
        if (isNearSwitch) {
            toggleLight();
        }
    } else if (e.code === 'KeyL') {
        // Attiva/disattiva il log
        logger.toggle();
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
    // Verifica se il giocatore è vicino all'interruttore
    if (isNearSwitch) {
        isLightOn = !isLightOn;
        document.getElementById('instructions').style.visibility = isLightOn ? 'hidden' : 'visible';

        // Effetto di flickering quando la luce si accende
        if (isLightOn) {
            flickerLight();
            sounds.flicker.play();
            
            // Animazione dell'interruttore quando viene attivato
            if (models['fallbackSwitch']) {
                // Rotazione dell'interruttore
                models['fallbackSwitch'].rotation[2] = Math.PI / 6; // Inclina leggermente
                
                // Ripristina la rotazione dopo 300ms
                setTimeout(() => {
                    if (models['fallbackSwitch']) {
                        models['fallbackSwitch'].rotation[2] = 0;
                    }
                }, 300);
            }
            
            // Aggiorna anche l'indicatore
            if (models['switchIndicator']) {
                models['switchIndicator'].texture = 'lampLight'; // Cambia colore a bianco acceso
                
                // Ripristina il colore dopo 1 secondo
                setTimeout(() => {
                    if (models['switchIndicator']) {
                        models['switchIndicator'].texture = 'indicatorLight';
                    }
                }, 1000);
            }
        }

        logger.log(`Luce ${isLightOn ? 'accesa' : 'spenta'}`);
    } else {
        logger.log("Devi essere vicino all'interruttore per accendere/spegnere la luce");
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
    document.getElementById('start-menu').style.display = 'none';
    document.getElementById('crosshair').style.display = 'block';
    document.getElementById('top-bar').style.display = 'flex';
    
    // Aggiorna la posizione dell'area interattiva dello switch
    updateSwitchPosition();

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
    switchHint.innerHTML = 'Cerca l\'interruttore sulla parete SINISTRA! <br>Look for the ORANGE LIGHT!';
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

// Inizializzazione del pannello GUI avanzato
// Inizializzazione del pannello di controllo semplificata e funzionante
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
    // Questa funzione verrà chiamata nel gameLoop per animare costantemente l'interruttore
    
    // Verifica che l'interruttore esista
    if (!models['fallbackSwitch'] && !models['switch']) {
        return;
    }
    
    // Determina quale modello usare (fallback o caricato da OBJ)
    const switchModel = models['switch'] || models['fallbackSwitch'];
    const indicatorModel = models['switchIndicator'];
    
    // Tempo attuale per l'animazione
    const time = Date.now() * 0.001; // Converte in secondi
    
    // Animazione per quando il giocatore è vicino all'interruttore
    if (isNearSwitch) {
        // Pulsazione dell'interruttore (scaling)
        const pulseScale = 1.0 + Math.sin(time * 4) * 0.1;
        
        // Applica la scala mantenendo le proporzioni originali
        if (switchModel.originalScale) {
            switchModel.scale = [
                switchModel.originalScale[0] * pulseScale,
                switchModel.originalScale[1] * pulseScale,
                switchModel.originalScale[2] * pulseScale
            ];
        } else {
            // Se non abbiamo la scala originale, memorizzala
            switchModel.originalScale = [...switchModel.scale];
            switchModel.scale = [
                switchModel.scale[0] * pulseScale,
                switchModel.scale[1] * pulseScale,
                switchModel.scale[2] * pulseScale
            ];
        }
        
        // Animazione dell'indicatore (se esiste)
        if (indicatorModel) {
            // Fai lampeggiare l'indicatore
            const blinkIntensity = (Math.sin(time * 8) * 0.5 + 0.5);
            
            // Crea un colore che lampeggia tra arancione e rosso
            const indicatorColor = createColorTexture([
                1.0,                           // R - Rosso sempre al massimo
                0.5 * blinkIntensity,          // G - Verde varia per ottenere tonalità arancione/rosse
                0.0,                           // B - Blu sempre a 0
                1.0                            // A - Alpha sempre al massimo
            ]);
            
            // Aggiorna la texture solo se siamo vicini all'interruttore
            textures['indicatorLight'] = indicatorColor;
            indicatorModel.texture = 'indicatorLight';
        }
        
        // Aggiunta di un effetto visivo che indica che l'interruttore può essere usato
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
        
        // Animazione leggera anche quando non siamo vicini
        if (indicatorModel) {
            // Leggera pulsazione dell'indicatore
            const gentlePulse = (Math.sin(time * 2) * 0.2 + 0.8);
            indicatorModel.scale = [gentlePulse * 0.7, gentlePulse * 0.7, gentlePulse * 0.7];
        }
    }
    
    // Animazione speciale quando la luce è accesa/spenta
    if (isLightOn) {
        // Quando la luce è accesa, l'interruttore è in posizione "on"
        if (switchModel.switchAnimation !== 'on') {
            // Rotazione dell'interruttore (se non è già animato)
            switchModel.rotation[2] = Math.PI / 8; // Inclina leggermente
            switchModel.switchAnimation = 'on';
        }
    } else {
        // Quando la luce è spenta, l'interruttore è in posizione "off"
        if (switchModel.switchAnimation !== 'off') {
            switchModel.rotation[2] = -Math.PI / 8; // Inclina nell'altra direzione
            switchModel.switchAnimation = 'off';
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
            
            // Animazione più elaborata dell'interruttore quando viene attivato
            if (models['fallbackSwitch'] || models['switch']) {
                const switchModel = models['switch'] || models['fallbackSwitch'];
                
                // Sequenza di animazione
                let animationStep = 0;
                const animationInterval = setInterval(() => {
                    animationStep++;
                    
                    // Movimenti rapidi dell'interruttore
                    switch(animationStep) {
                        case 1:
                            switchModel.rotation[2] = Math.PI / 4; // Inclina molto
                            break;
                        case 2:
                            switchModel.rotation[2] = -Math.PI / 6; // Inclina nell'altra direzione
                            break;
                        case 3:
                            switchModel.rotation[2] = Math.PI / 8; // Posizione finale
                            clearInterval(animationInterval);
                            break;
                    }
                }, 80);
            }
            
            // Aggiorna anche l'indicatore
            if (models['switchIndicator']) {
                // Effetto flash
                const originalTexture = models['switchIndicator'].texture;
                models['switchIndicator'].texture = 'lampLight'; // Cambia colore a bianco acceso
                
                // Sequenza di lampeggiamento
                setTimeout(() => {
                    if (models['switchIndicator']) models['switchIndicator'].texture = originalTexture;
                    setTimeout(() => {
                        if (models['switchIndicator']) models['switchIndicator'].texture = 'lampLight';
                        setTimeout(() => {
                            if (models['switchIndicator']) models['switchIndicator'].texture = originalTexture;
                        }, 100);
                    }, 100);
                }, 100);
            }
            
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
            // Animazione per lo spegnimento della luce
            if (models['fallbackSwitch'] || models['switch']) {
                const switchModel = models['switch'] || models['fallbackSwitch'];
                switchModel.rotation[2] = -Math.PI / 8; // Inclina in posizione "off"
            }
            
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

        logger.log(`Luce ${isLightOn ? 'accesa' : 'spenta'}`);
    } else {
        logger.log("Devi essere vicino all'interruttore per accendere/spegnere la luce");
    }
}

// Configurazione controlli touch
function setupTouchControls() {
    // Mostra controlli touch su dispositivi mobili
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        const touchControls = document.querySelector('.touch-controls');
        touchControls.style.display = 'flex';
        
        // Aggiungiamo un pulsante dedicato per il pannello di controllo
        const panelButton = document.createElement('div');
        panelButton.id = 'touch-panel';
        panelButton.className = 'touch-button';
        panelButton.textContent = 'P';
        panelButton.style.position = 'absolute';
        panelButton.style.top = '20px';
        panelButton.style.right = '20px';
        document.body.appendChild(panelButton);

        // Aggiungiamo un pulsante per la vista a 360°
        const lookButton = document.createElement('div');
        lookButton.id = 'touch-look';
        lookButton.className = 'touch-button';
        lookButton.textContent = '👁️';
        lookButton.style.position = 'absolute';
        lookButton.style.top = '20px';
        lookButton.style.left = '20px';
        document.body.appendChild(lookButton);

        // WASD - movimento
        document.getElementById('touch-forward').addEventListener('touchstart', () => {
            keys['KeyW'] = true;
        });
        document.getElementById('touch-forward').addEventListener('touchend', () => {
            keys['KeyW'] = false;
        });

        document.getElementById('touch-left').addEventListener('touchstart', () => {
            keys['KeyA'] = true;
        });
        document.getElementById('touch-left').addEventListener('touchend', () => {
            keys['KeyA'] = false;
        });

        document.getElementById('touch-backward').addEventListener('touchstart', () => {
            keys['KeyS'] = true;
        });
        document.getElementById('touch-backward').addEventListener('touchend', () => {
            keys['KeyS'] = false;
        });

        document.getElementById('touch-right').addEventListener('touchstart', () => {
            keys['KeyD'] = true;
        });
        document.getElementById('touch-right').addEventListener('touchend', () => {
            keys['KeyD'] = false;
        });

        // Interazione luce
        document.getElementById('touch-light').addEventListener('touchstart', toggleLight);
        
        // Pannello di controllo
        panelButton.addEventListener('touchstart', togglePanel);
        
        // Modalità look around
        let lookMode = false;
        lookButton.addEventListener('touchstart', () => {
            lookMode = !lookMode;
            lookButton.style.backgroundColor = lookMode ? 'rgba(255, 77, 77, 0.7)' : 'rgba(30, 30, 30, 0.7)';
            
            // Mostra messaggio di aiuto
            const lookModeMsg = document.getElementById('look-mode-msg') || document.createElement('div');
            lookModeMsg.id = 'look-mode-msg';
            lookModeMsg.style.position = 'absolute';
            lookModeMsg.style.top = '80px';
            lookModeMsg.style.left = '50%';
            lookModeMsg.style.transform = 'translateX(-50%)';
            lookModeMsg.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            lookModeMsg.style.color = '#fff';
            lookModeMsg.style.padding = '10px';
            lookModeMsg.style.borderRadius = '5px';
            lookModeMsg.style.textAlign = 'center';
            lookModeMsg.style.zIndex = '100';
            
            if (lookMode) {
                lookModeMsg.textContent = 'Modalità Vista: Tocca e trascina per guardare intorno';
                document.body.appendChild(lookModeMsg);
            } else {
                lookModeMsg.textContent = '';
                if (document.body.contains(lookModeMsg)) {
                    document.body.removeChild(lookModeMsg);
                }
            }
        });

        // Gestione touch per la rotazione della camera
        let touchStartX = 0;
        let touchStartY = 0;
        let isMoving = false;

        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            
            if (lookMode && e.touches.length === 1) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                isMoving = true;
            }
        });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            
            if (lookMode && isMoving && e.touches.length === 1) {
                const touchX = e.touches[0].clientX;
                const touchY = e.touches[0].clientY;
                
                // Aumentata sensibilità per migliorare l'esperienza su mobile
                const sensitivity = 0.008;
                
                // Calcola il movimento e aggiorna la rotazione della camera
                camera.rotation[1] -= (touchX - touchStartX) * sensitivity;
                camera.rotation[0] += (touchY - touchStartY) * sensitivity;
                
                // Limita la rotazione verticale per evitare capovolgimenti
                camera.rotation[0] = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, camera.rotation[0]));
                
                // Aggiorna le posizioni di partenza per il prossimo movimento
                touchStartX = touchX;
                touchStartY = touchY;
            }
        });

        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            isMoving = false;
        });

        // Aggiungiamo indicatori di interazione
        const touchInteractionIndicator = document.createElement('div');
        touchInteractionIndicator.id = 'touch-interaction';
        touchInteractionIndicator.style.position = 'absolute';
        touchInteractionIndicator.style.bottom = '40%';
        touchInteractionIndicator.style.left = '50%';
        touchInteractionIndicator.style.transform = 'translateX(-50%)';
        touchInteractionIndicator.style.color = '#ff4d4d';
        touchInteractionIndicator.style.textShadow = '0 0 5px black';
        touchInteractionIndicator.style.fontWeight = 'bold';
        touchInteractionIndicator.style.fontSize = '24px';
        touchInteractionIndicator.style.display = 'none';
        touchInteractionIndicator.style.zIndex = '100';
        document.body.appendChild(touchInteractionIndicator);

        // Modifichiamo la funzione updateCrosshair per mostrare indicazioni su mobile
        const originalUpdateCrosshair = updateCrosshair;
        updateCrosshair = function() {
            originalUpdateCrosshair();
            
            // Mostra indicatore di interazione su mobile
            if (isNearSwitch) {
                touchInteractionIndicator.textContent = 'Premi F per l\'interruttore';
                touchInteractionIndicator.style.display = 'block';
            } else {
                touchInteractionIndicator.style.display = 'none';
            }
        };

        logger.log('Controlli touch migliorati configurati per dispositivi mobili');
    }
}

// Funzione per ridimensionare il canvas
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    logger.log(`Canvas ridimensionato: ${canvas.width}x${canvas.height}`);
}

// Inizializzazione degli shader
function initShaders() {
    try {
        // Shader principali per gli oggetti
        const vertexShaderSource = document.getElementById('vertex-shader').textContent;
        const fragmentShaderSource = document.getElementById('fragment-shader').textContent;

        // Compila vertex shader
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vertexShaderSource);
        gl.compileShader(vertexShader);

        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            logger.log('Errore nel vertex shader: ' + gl.getShaderInfoLog(vertexShader));
            return false;
        }

        // Compila fragment shader
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fragmentShaderSource);
        gl.compileShader(fragmentShader);

        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            logger.log('Errore nel fragment shader: ' + gl.getShaderInfoLog(fragmentShader));
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

    // Carica texture di base
    loadTexture('textures/wall.jpg', 'wall');
    loadTexture('textures/wood.jpg', 'floor');
    loadTexture('textures/wood.jpg', 'ceiling');
    loadTexture('textures/glass.png', 'glass');

    // Carica texture per gli oggetti
    loadTexture('textures/Skull.jpg', 'skull_texture');
    loadTexture('textures/wood-clock.png', 'wood_texture');
    loadTexture('textures/clock.png', 'clock_texture');
    loadTexture('textures/DiffuseMap_LOD0.png', 'doll_texture');
    loadTexture('textures/Doll_Doll_BaseColor.png', 'doll_base_texture');

    // Carica texture della skybox e altre texture
    loadSkyboxTextures();
    loadTexture('textures/switch/Albedo.png', 'switch_albedo');
    loadTexture('textures/switch/normal.png', 'switch_normal');
    loadTexture('textures/switch/roughness.png', 'switch_roughness');

    // Carica modelli OBJ
    loadOBJModel('models/12140_Skull_v3_L2.obj', 'models/12140_Skull_v3_L2.mtl', 'skull');
    loadOBJModel('models/kurumaisu.unity_1.obj', 'models/kurumaisu.unity_1.mtl', 'chair');
    loadOBJModel('models/UnsavedScene_1.obj', 'models/UnsavedScene_1.mtl', 'wheelie');
    loadOBJModel('models/doll.obj', 'models/doll.mtl', 'doll');
    loadOBJModel('models/light_switch.obj', 'models/light_switch.mtl', 'switch');
    loadOBJModel('models/lamp.obj', 'models/lamp.mtl', 'lamp');
    loadOBJModel('models/pendent-clock.obj', 'models/pendent-clock.mtl', 'clock');

    // Crea l'interruttore fallback DOPO aver tentato di caricare l'OBJ
    // Il controllo interno verificherà se è necessario
    setTimeout(function() {
        createSwitch();
    }, 1000); // Attendi 1 secondo per dare tempo agli OBJ di caricarsi

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
            // Impostazioni per texture con dimensioni potenze di 2
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.generateMipmap(gl.TEXTURE_2D);
        } else {
            // Impostazioni per texture con dimensioni NON potenze di 2
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.bindTexture(gl.TEXTURE_2D, null);

        textures[name] = texture;
        logger.log(`Texture caricata: ${name}`);
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
        'textures/skybox/nz.png' // Back
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
                createSkybox(); // Crea la geometria dello skybox dopo aver caricato le texture
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
function loadOBJModel(objUrl, mtlUrl, name, successCallback, errorCallback) {
    logger.log(`Caricamento modello: ${name}`);

    // Controlla se i percorsi sono definiti
    if (!objUrl) {
        logger.log(`ERRORE: Percorso OBJ non specificato per ${name}`);
        if (errorCallback) errorCallback();
        else createFallbackModel(name);
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
                    if (errorCallback) errorCallback();
                    else createFallbackModel(name);
                    return;
                }

                // Prova a parsare il modello OBJ usando il parser personalizzato
                const model = parseOBJ(objData);

                // Verifica che il modello abbia vertici validi
                if (!model || !model.vertices || model.vertices.length === 0) {
                    logger.log(`ERRORE: Il modello ${name} non ha vertici validi`);
                    if (errorCallback) errorCallback();
                    else createFallbackModel(name);
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
                if (errorCallback) errorCallback();
                else createFallbackModel(name);
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            logger.log(`Errore durante il caricamento di ${name}: ${textStatus} - ${errorThrown}`);
            if (errorCallback) errorCallback();
            else createFallbackModel(name);
        }
    });
}

// Posiziona i modelli nella scena in base al tipo
function positionModel(name) {
    if (!models[name]) return;

    if (name === 'skull') {
        // Nascondi l'originale
        models[name].position = [100, 100, 100]; // Fuori dalla scena
        models[name].scale = [0.05, 0.05, 0.05]; // Scala dell'originale

        // Posiziona i teschi lungo le pareti DENTRO la stanza
        for (let i = 0; i < 5; i++) {
            const angle = i * Math.PI * 0.4;
            const distance = roomSize * 0.8;
            const x = Math.sin(angle) * distance;
            const z = Math.cos(angle) * distance;

            // Posiziona a varie altezze DENTRO la stanza
            const y = -1 - Math.random() * 3; // Valori tra -1 e -4

            const cloneName = `skull_${i}`;
            models[cloneName] = Object.assign({}, models[name]);
            models[cloneName].position = [x, y, z];
            models[cloneName].rotation = [0, -angle + Math.PI, 0];
            models[cloneName].scale = [0.03, 0.03, 0.03];
            models[cloneName].texture = 'skull_texture';
        }
    } else if (name === 'chair') {
        // Posiziona sedie sul pavimento DENTRO la stanza
        models[name].position = [3, -7.1, -3]; // Y=0 è il pavimento
        models[name].rotation = [0, Math.PI / 4, 0];
        models[name].scale = [0.15, 0.15, 0.15];
        models[name].texture = 'wood_texture';

        // Aggiungi una seconda sedia
        const cloneName = `${name}_2`;
        models[cloneName] = Object.assign({}, models[name]);
        models[cloneName].position = [-3, -7.1, 2]; // Y=0 è il pavimento
        models[cloneName].rotation = [0, -Math.PI / 3, 0];
    } else if (name === 'doll') {
        // Posiziona la bambola in modo casuale sul pavimento DENTRO la stanza
        const randomX = (Math.random() * 2 - 1) * (roomSize * 0.6);
        const randomZ = (Math.random() * 2 - 1) * (roomSize * 0.6);
        models[name].position = [randomX, -5, randomZ]; // Y=0 è il pavimento
        models[name].rotation = [0, Math.random() * Math.PI * 2, 0];
        models[name].scale = [0.9, 0.9, 0.9];
        models[name].texture = 'doll_base_texture';

        // Aggiorna la posizione della bambola per l'interazione
        dollPosition = [randomX, 0, randomZ];
        logger.log(`Bambola posizionata a: [${randomX}, 0, ${randomZ}]`);
    } else if (name === 'lamp') {
        // Posiziona il lampadario al centro della stanza, attaccato al soffitto
        models[name].position = [0, 0, 0]; // Attaccato al soffitto
        models[name].rotation = [Math.PI/2, 0, 0]; // Ruotalo per puntare verso il pavimento
        models[name].scale = [2.5, 2.5, 2.5]; // Dimensione appropriata
        models[name].isEmissive = true; // Il lampadario emette luce
        models[name].texture = 'lampLight'; // Assegna una texture luminosa

        // Crea una texture luminosa se non esiste già
        if (!textures['lampLight']) {
            const lampLightColor = createColorTexture([1.0, 0.95, 0.8, 1.0]); // Bianco caldo
            textures['lampLight'] = lampLightColor;
        }
        models[name].texture = 'lampLight';

        // Aggiorna la posizione della luce
        lightPosition = [0, 0, 0];    
    } else if (name === 'switch' || name === 'lightSwitch') {
        // Posiziona l'interruttore sulla parete destra dove appare il messaggio
        const switchX = roomSize - 0.3; // Vicino alla parete destra
        const switchY = -1.7; // Altezza occhi
        const switchZ = 0; // Centro della stanza lungo Z
    
        models[name].position = [switchX, switchY, switchZ];
        models[name].rotation = [0, -Math.PI / 2, 0]; // Rivolto verso l'interno
        models[name].scale = [3.3, 3.3, 3.3]; // Dimensione ben visibile
        models[name].isEmissive = true;
        models[name].texture = 'switch_albedo'; // Usa la texture corretta
    
        // Aggiorna la posizione per l'interazione
        switchPosition = [switchX, switchY, switchZ];
                
        logger.log(`Modello interruttore OBJ posizionato sulla parete destra: [${switchPosition}]`);
    } else if (name === 'wheelie') {
        // Posiziona la sedia a rotelle in un angolo
        models[name].position = [5, -6.7, 4]; // Sul pavimento, angolo destro
        models[name].rotation = [0, 0, 0];
        models[name].scale = [0.15, 0.15, 0.15];
        models[name].texture = 'wood_texture';
    } else if (name === 'clock') {
        // Posiziona l'orologio sulla parete
        models[name].position = [4, -5.5, -roomSize + 0.8]; // Sul muro frontale
        models[name].rotation = [0, - Math.PI / 2, 0];
        models[name].scale = [0.6, 0.6, 0.6];
        models[name].texture = 'clock_texture';
    } 
}

function updateSwitchPosition() {
    // Trova la posizione attuale dove appare il messaggio (probabilmente sulla parete destra)
    const messageX = roomSize - 0.3; // Vicino alla parete destra
    const messageY = -1.7;          // Altezza degli occhi
    const messageZ = 0;             // Centro della stanza lungo Z

    // Aggiorna la posizione per l'interazione
    switchPosition = [messageX, messageY, messageZ];
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

// Funzione per creare un modello fallback
function createFallbackModel(name) {
    // Crea un cubo semplice come modello di fallback
    const size = 0.5;
    models[name] = {
        vertices: [
            // Faccia frontale
            -size, -size, -size,
            size, -size, -size,
            size, size, -size,
            -size, -size, -size,
            size, size, -size,
            -size, size, -size,

            // Faccia posteriore
            -size, -size, size,
            -size, size, size,
            size, size, size,
            -size, -size, size,
            size, size, size,
            size, -size, size,

            // Faccia superiore
            -size, size, -size,
            size, size, -size,
            size, size, size,
            -size, size, -size,
            size, size, size,
            -size, size, size,

            // Faccia inferiore
            -size, -size, -size,
            -size, -size, size,
            size, -size, size,
            -size, -size, -size,
            size, -size, size,
            size, -size, -size,

            // Faccia destra
            size, -size, -size,
            size, -size, size,
            size, size, size,
            size, -size, -size,
            size, size, size,
            size, size, -size,

            // Faccia sinistra
            -size, -size, -size,
            -size, size, -size,
            -size, size, size,
            -size, -size, -size,
            -size, size, size,
            -size, -size, size
        ],
        normals: [
            // Faccia frontale (normale: 0, 0, -1)
            0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,

            // Faccia posteriore (normale: 0, 0, 1)
            0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,

            // Faccia superiore (normale: 0, 1, 0)
            0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,

            // Faccia inferiore (normale: 0, -1, 0)
            0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,

            // Faccia destra (normale: 1, 0, 0)
            1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,

            // Faccia sinistra (normale: -1, 0, 0)
            -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0
        ],
        texcoords: [
            // Faccia frontale
            0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1,

            // Faccia posteriore
            1, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 0,

            // Faccia superiore
            0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0,

            // Faccia inferiore
            1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0,

            // Faccia destra
            1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1,

            // Faccia sinistra
            0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1
        ],
        position: [0, 1, 0], // Posizione di default
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        texture: 'wall'
    };

    logger.log(`Creato modello fallback per ${name}`);
}

// Funzione per attivare/disattivare la modalità spettatore
function toggleSpectatorMode() {
    isSpectatorMode = !isSpectatorMode;
    
    if (isSpectatorMode) {
        // Salva la posizione originale
        camera.originalPosition = [...camera.position];
        camera.originalRotation = [...camera.rotation];
        
        // Aumenta la velocità
        camera.speed = 0.3;
        
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
        camera.speed = 0.1;
        
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
}

// Funzione per attivare/disattivare lo sprint
function toggleSprint(active) {
    // Se in modalità spettatore, ignora lo sprint
    if (isSpectatorMode) return;
    
    isSprinting = active;
    
    // Modifica la velocità del giocatore in base allo stato dello sprint
    if (isSprinting) {
        playerSpeed = 0.3; // Velocità di sprint
    } else {
        playerSpeed = 0.15; // Velocità normale
    }
    
    logger.log(`Sprint ${isSprinting ? 'attivato' : 'disattivato'}`);
}

// Funzione per creare una texture di colore solido
function createColorTexture(color) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Crea un pixel con il colore specificato
    const pixel = new Uint8Array([
        Math.floor(color[0] * 255),
        Math.floor(color[1] * 255),
        Math.floor(color[2] * 255),
        Math.floor(color[3] * 255)
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