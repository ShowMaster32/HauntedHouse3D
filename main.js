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
        playerVelocity[0] += forward[0] * speed;
        playerVelocity[2] += forward[2] * speed;
    }
    if (keys['KeyS']) {
        playerVelocity[0] -= forward[0] * speed;
        playerVelocity[2] -= forward[2] * speed;
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

    // Renderizza prima tutti gli oggetti non trasparenti
    for (const modelName in models) {
        if (modelName === 'skybox') continue; // Skybox già renderizzato

        const model = models[modelName];
        if (!model || model.isTransparent || !model.vertices || model.vertices.length === 0) continue;

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

    // Poi renderizza gli oggetti trasparenti
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    for (const modelName in models) {
        if (modelName === 'skybox') continue;

        const model = models[modelName];
        if (!model || !model.isTransparent || !model.vertices || model.vertices.length === 0) continue;

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

    // Disabilita il blending dopo aver renderizzato gli oggetti trasparenti
    gl.disable(gl.BLEND);
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
    const switchSize = 0.3;

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
    const switchColor = createColorTexture([0.8, 0.2, 0.2, 1.0]); // Rosso
    textures['switchColor'] = switchColor;

    // Posiziona l'interruttore sulla parete sinistra
    const switchX = -roomSize + 0.1; // Vicino alla parete sinistra
    const switchY = 1.5; // Altezza a livello degli occhi
    const switchZ = 2.5; // Centro della stanza lungo Z

    // Aggiungi l'interruttore ai modelli
    models['fallbackSwitch'] = {
        vertices: switchVertices,
        normals: switchNormals,
        texcoords: switchTexcoords,
        position: [switchX, switchY, switchZ],
        rotation: [0, Math.PI / 2, 0],
        scale: [1, 1, 1], // Scala normale
        texture: 'switchColor',
        isEmissive: true
    };

    // Crea un indicatore arancione molto visibile
    const indicatorLight = createColorTexture([1.0, 0.5, 0.0, 1.0]); // Arancione
    textures['indicatorLight'] = indicatorLight;

    // Aggiungi l'indicatore sopra l'interruttore
    models['switchIndicator'] = {
        vertices: switchVertices,
        normals: switchNormals,
        texcoords: switchTexcoords,
        position: [switchX, switchY - 0.6, switchZ], // Sotto l'interruttore
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        texture: 'indicatorLight',
        isEmissive: true
    };

    // Aggiorna anche la posizione per l'interazione
    switchPosition = [switchX, switchY, switchZ];

    logger.log(`Interruttore fallback posizionato a: [${switchPosition}]`);
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

// Crea una stanza semplice
function createSimpleRoom() {
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

    // Parete frontale
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
        texture: 'wall'
    };

    // Parete posteriore
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
        texture: 'wall'
    };

    // Parete sinistra
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
        texture: 'wall'
    };

    // Parete destra
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
        texture: 'wall'
    };

    // Aggiungi finestre
    addWindows();

    logger.log('Stanza semplice creata');
}

// Funzione per aggiungere finestre alla stanza
function addWindows() {
    // Texture per il vetro
    if (!textures['glass']) {
        // Crea una texture semplice se non è stata caricata
        const glassCanvas = document.createElement('canvas');
        glassCanvas.width = 2;
        glassCanvas.height = 2;
        const ctx = glassCanvas.getContext('2d');
        ctx.fillStyle = 'rgba(180, 200, 255, 0.3)'; // Azzurro semitrasparente
        ctx.fillRect(0, 0, 2, 2);

        const glassTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, glassTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, glassCanvas);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.bindTexture(gl.TEXTURE_2D, null);

        textures['glass'] = glassTexture;
        logger.log('Texture vetro creata');
    }

    // Aggiungi finestra sulla parete frontale (a filo con la superficie esterna)
    models['frontWindow'] = {
        vertices: [
            -2, -1, -roomSize + 0.01, // Leggermente spostata verso l'interno per evitare z-fighting
            2, -1, -roomSize + 0.01,
            2, -4, -roomSize + 0.01,
            -2, -1, -roomSize + 0.01,
            2, -4, -roomSize + 0.01,
            -2, -4, -roomSize + 0.01
        ],
        normals: [
            0, 0, 1, // Normali verso l'interno della stanza
            0, 0, 1,
            0, 0, 1,
            0, 0, 1,
            0, 0, 1,
            0, 0, 1
        ],
        texcoords: [
            0, 0, // In alto a sinistra
            1, 0, // In alto a destra
            1, 1, // In basso a destra
            0, 0, // In alto a sinistra
            1, 1, // In basso a destra
            0, 1 // In basso a sinistra
        ],
        position: [0, 0, 0],
        scale: [1, 1, 1],
        texture: 'glass',
        isTransparent: true // Flag per il rendering con blending
    };

    // Aggiungi finestra sulla parete posteriore (a filo con la superficie esterna)
    models['backWindow'] = {
        vertices: [
            -2, -1, roomSize - 0.01, // Leggermente spostata verso l'interno per evitare z-fighting
            2, -4, roomSize - 0.01,
            2, -1, roomSize - 0.01,
            -2, -1, roomSize - 0.01,
            -2, -4, roomSize - 0.01,
            2, -4, roomSize - 0.01
        ],
        normals: [
            0, 0, -1, // Normali verso l'interno della stanza
            0, 0, -1,
            0, 0, -1,
            0, 0, -1,
            0, 0, -1,
            0, 0, -1
        ],
        texcoords: [
            0, 0, // In alto a sinistra
            1, 1, // In basso a destra
            1, 0, // In alto a destra
            0, 0, // In alto a sinistra
            0, 1, // In basso a sinistra
            1, 1 // In basso a destra
        ],
        position: [0, 0, 0],
        scale: [1, 1, 1],
        texture: 'glass',
        isTransparent: true // Flag per il rendering con blending
    };

    logger.log('Finestre create');
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
function initGUI() {
    const gui = new dat.GUI({
        autoPlace: false
    });

    // Posiziona manualmente il pannello GUI
    const guiContainer = document.createElement('div');
    guiContainer.id = 'gui-container';
    guiContainer.style.position = 'absolute';
    guiContainer.style.top = '10px';
    guiContainer.style.right = '10px';
    guiContainer.style.zIndex = '5';
    guiContainer.style.display = 'none'; // Nascondi all'inizio
    guiContainer.appendChild(gui.domElement);
    document.body.appendChild(guiContainer);

    // Aggiungi controlli per la luce
    const lightFolder = gui.addFolder('Illuminazione');
    lightFolder.add({
        intensity: 1.0
    }, 'intensity', 0.1, 2.0).name('Intensità').onChange(value => {
        // Logica per cambiare l'intensità della luce
        logger.log(`Intensità luce modificata: ${value}`);
    });

    // Aggiungi controlli per la camera
    const cameraFolder = gui.addFolder('Camera');
    cameraFolder.add(camera, 'speed', 0.05, 0.3).name('Velocità');
    cameraFolder.add({
        fov: 70
    }, 'fov', 60, 100).name('Campo visivo').onChange(value => {
        // Logica per cambiare il FOV
        logger.log(`FOV modificato: ${value}`);
    });

    // Aggiungi controlli per gli effetti di rendering avanzati
    const renderingFolder = gui.addFolder('Rendering');
    renderingFolder.add(renderOptions, 'advancedRendering').name('Rendering Avanzato');
    renderingFolder.add(renderOptions, 'shadows').name('Ombre');
    renderingFolder.add(renderOptions, 'reflections').name('Riflessioni');

    // Aggiungi controlli per il debugging
    const debugFolder = gui.addFolder('Debug');
    debugFolder.add(renderOptions, 'showFPS').name('Mostra FPS').onChange(value => {
        const fpsElement = document.getElementById('fps-counter');
        if (fpsElement) {
            fpsElement.style.display = value ? 'block' : 'none';
        }
    });
    debugFolder.add({
        camera: showCameraCoordinates
    }, 'camera').name('Mostra Coordinate').onChange(value => {
        showCameraCoordinates = value;
        const coordElement = document.getElementById('camera-coords');
        if (coordElement) {
            coordElement.style.display = value ? 'block' : 'none';
        }
    });

    // Aggiungi controlli per audio
    const audioFolder = gui.addFolder('Audio');
    audioFolder.add({
        volume: 0.5
    }, 'volume', 0, 1).name('Volume Ambientale').onChange(value => {
        if (sounds.ambient) {
            sounds.ambient.volume = value;
            logger.log(`Volume ambientale modificato: ${value}`);
        }
    });

    logger.log('GUI inizializzata');
}

// Configurazione controlli touch
function setupTouchControls() {
    // Mostra controlli touch su dispositivi mobili
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        document.querySelector('.touch-controls').style.display = 'flex';

        // Aggiungi event listeners per i pulsanti touch
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

        document.getElementById('touch-light').addEventListener('touchstart', toggleLight);

        // Touch per spostare la camera
        canvas.addEventListener('touchstart', handleTouchStart);
        canvas.addEventListener('touchmove', handleTouchMove);
        canvas.addEventListener('touchend', handleTouchEnd);

        logger.log('Controlli touch configurati');
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
    loadOBJModel('models/orologio-horror.obj', 'models/orologio-horror.mtl', 'horror_clock');

    // Crea l'interruttore fallback nel caso il modello OBJ non si carichi
    createSwitch();

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
function loadOBJModel(objUrl, mtlUrl, name) {
    logger.log(`Caricamento modello: ${name}`);

    // Controlla se i percorsi sono definiti
    if (!objUrl) {
        logger.log(`ERRORE: Percorso OBJ non specificato per ${name}`);
        createFallbackModel(name);
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
                    createFallbackModel(name);
                    return;
                }

                // Prova a parsare il modello OBJ usando il parser personalizzato
                const model = parseOBJ(objData);

                // Verifica che il modello abbia vertici validi
                if (!model || !model.vertices || model.vertices.length === 0) {
                    logger.log(`ERRORE: Il modello ${name} non ha vertici validi`);
                    createFallbackModel(name);
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
            } catch (error) {
                logger.log(`Errore durante il parsing di ${name}: ${error.message}`);
                createFallbackModel(name);
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            logger.log(`Errore durante il caricamento di ${name}: ${textStatus} - ${errorThrown}`);
            createFallbackModel(name);
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
            models[cloneName].scale = [0.05, 0.05, 0.05];
            models[cloneName].texture = 'skull_texture';
        }
    } else if (name === 'chair') {
        // Posiziona sedie sul pavimento DENTRO la stanza
        models[name].position = [3, -6.79, -3]; // Y=0 è il pavimento
        models[name].rotation = [0, Math.PI / 4, 0];
        models[name].scale = [0.15, 0.15, 0.15];
        models[name].texture = 'wood_texture';

        // Aggiungi una seconda sedia
        const cloneName = `${name}_2`;
        models[cloneName] = Object.assign({}, models[name]);
        models[cloneName].position = [-3, -6.79, 2]; // Y=0 è il pavimento
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
        models[name].position = [0, -roomHeight + 0.1, 0]; // Attaccato al soffitto
        models[name].rotation = [Math.PI, 0, 0]; // Ruotalo per puntare verso il pavimento
        models[name].scale = [0.3, 0.3, 0.3]; // Dimensione appropriata
        models[name].isEmissive = true; // Il lampadario emette luce
        models[name].texture = 'lampLight'; // Assegna una texture luminosa

        // Crea una texture luminosa se non esiste già
        if (!textures['lampLight']) {
            const lampLightColor = createColorTexture([1.0, 0.95, 0.8, 1.0]); // Bianco caldo
            textures['lampLight'] = lampLightColor;
        }
        models[name].texture = 'lampLight';

        // Aggiorna la posizione della luce
        lightPosition = [0, -roomHeight + 1.0, 0]; // 1 metro sotto il soffitto        
    } else if (name === 'switch' || name === 'lightSwitch') {
        // Posiziona l'interruttore sulla parete sinistra
        const switchX = -roomSize + 0.1; // Vicino alla parete sinistra
        const switchY = 1.5; // Altezza a metà stanza
        const switchZ = 2.5; // Un po' avanti lungo la parete

        models[name].position = [switchX, switchY, switchZ];
        models[name].rotation = [0, Math.PI / 2, 0]; // Rivolto verso l'interno
        models[name].scale = [0.05, 0.05, 0.05];

        // Aggiorna la posizione per l'interazione
        switchPosition = [switchX, switchY, switchZ];
    } else if (name === 'wheelie') {
        // Posiziona la sedia a rotelle in un angolo
        models[name].position = [5, -6, 4]; // Sul pavimento, angolo destro
        models[name].rotation = [0, Math.PI / 6, 0];
        models[name].scale = [0.15, 0.15, 0.15];
        models[name].texture = 'wood_texture';
    } else if (name === 'clock') {
        // Posiziona l'orologio sulla parete
        models[name].position = [0, -2, -roomSize + 0.15]; // Sul muro frontale
        models[name].rotation = [0, 0, 0];
        models[name].scale = [1, 1, 1];
        models[name].texture = 'clock_texture';
    } else if (name === 'horror_clock') {
        // Posiziona l'orologio horror sulla parete laterale
        models[name].position = [roomSize - 0.15, -2, 0]; // Sul muro destro
        models[name].rotation = [0, -Math.PI / 2, 0];
        models[name].scale = [0.1, 0.1, 0.1];
        models[name].texture = 'clock_texture';
    }
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