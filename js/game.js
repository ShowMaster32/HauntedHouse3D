// game.js
// Classe principale per la gestione del gioco

class Game {
    constructor() {
        // Riferimenti agli elementi del DOM
        this.canvas = document.getElementById('canvas');
        this.container = document.getElementById('container');
        
        // Stato del gioco
        this.isRunning = false;
        this.isPaused = false;
        this.isLightOn = true;
        this.isLightFlickering = false;
        this.canToggleLight = true;
        
        // Costanti della stanza dalle impostazioni globali
        this.ROOM_WIDTH = GAME_CONSTANTS.ROOM.WIDTH || 20;
        this.ROOM_HEIGHT = GAME_CONSTANTS.ROOM.HEIGHT || 10;
        this.ROOM_DEPTH = GAME_CONSTANTS.ROOM.DEPTH || 25;
        this.WALL_THICKNESS = GAME_CONSTANTS.ROOM.WALL_THICKNESS || 0.1;
        
        // Stato del giocatore - posizione iniziale
        this.player = {
            position: [0, 1.7, 0],  // Altezza umana standard
            rotation: [0, 0, 0],
            onFloor: true
        };
        
        // Inizializza la camera
        this.camera = {
            position: [0, 1.7, 0],
            rotation: { x: 0, y: 0, z: 0 },
            fov: GAME_CONSTANTS.CAMERA.FOV * Math.PI / 180 || 70 * Math.PI / 180,
            near: GAME_CONSTANTS.CAMERA.NEAR || 0.1,
            far: GAME_CONSTANTS.CAMERA.FAR || 1000
        };

        // Inizializza i sottosistemi
        this.physics = new PhysicsSystem();
        this.audio = new AudioManager();
        this.input = new InputHandler(this);
        
        // Configurazione luce principale
        this.light = {
            position: [0, 8, 0],
            color: GAME_CONSTANTS.LIGHTS.MAIN_LIGHT.COLOR || [1, 1, 1],
            intensity: GAME_CONSTANTS.LIGHTS.MAIN_LIGHT.INTENSITY || 150,
            enabled: true
        };
        
        // Elementi della scena
        this.scene = {
            objects: new Map(),
            lights: new Map()
        };
        
        // Setup degli event listeners
        this.setupEventListeners();
        
        this.log('Gioco inizializzato');
    }
    
    // Funzione di log
    log(message, isError = false) {
        console.log(isError ? `[GAME ERROR] ${message}` : `[GAME] ${message}`);
        
        if (typeof logDebug === 'function') {
            logDebug(message, isError ? 'error' : 'info');
        }
    }
    
    // Inizializzazione del gioco
    async initialize() {
        try {
            this.log('Inizializzazione del gioco in corso...');
            
            // Inizializza la fisica della stanza
            this.physics.initializeCollisionGeometry(
                this.ROOM_WIDTH,
                this.ROOM_HEIGHT,
                this.ROOM_DEPTH,
                this.WALL_THICKNESS
            );
            
            // Crea e inizializza il renderer
            this.renderer = new Renderer(this.canvas);
            await this.renderer.initialize();
            
            // Avvia l'inizializzazione del gioco
            await this.initializeGame();
            
            this.log('Inizializzazione completata con successo');
            return true;
        } catch (error) {
            this.log('Errore durante l\'inizializzazione del gioco: ' + error, true);
            throw error;
        }
    }
    
    // Inizializzazione degli elementi del gioco
    async initializeGame() {
        try {
            // Carica le mesh
            await this.loadMeshes();
            
            // Carica le texture
            await this.loadTextures();
            
            // Configura la scena
            this.setupScene();
            
            // Aggiungi gli oggetti interattivi
            this.addInteractiveObjects();
            
            this.log('Elementi del gioco inizializzati');
        } catch (error) {
            this.log('Errore durante l\'inizializzazione degli elementi del gioco: ' + error, true);
            throw error;
        }
    }
    
    // Caricamento delle mesh
    async loadMeshes() {
        this.log('Caricamento mesh...');
        
        await Promise.all([
            // Clock con materiali
            this.renderer.loadMesh('clock', GAME_CONSTANTS.ASSETS.MODELS.CLOCK || 'models/pendent-clock.obj'),
            
            // Doll con materiali
            this.renderer.loadMesh('doll', GAME_CONSTANTS.ASSETS.MODELS.DOLL || 'models/doll.obj'),
            
            // Wheelchair1 con materiali
            this.renderer.loadMesh('wheelchair1', GAME_CONSTANTS.ASSETS.MODELS.WHEELCHAIR1 || 'models/kurumaisu.unity_1.obj'),
            
            // Wheelchair2 con materiali
            this.renderer.loadMesh('wheelchair2', GAME_CONSTANTS.ASSETS.MODELS.WHEELCHAIR2 || 'models/UnsavedScene_1.obj'),
            
            // Skull con materiali
            this.renderer.loadMesh('skull', GAME_CONSTANTS.ASSETS.MODELS.SKULL || 'models/12140_Skull_v3_L2.obj'),
            
            // Switch con materiali
            this.renderer.loadMesh('switch', GAME_CONSTANTS.ASSETS.MODELS.SWITCH || 'models/Switch.fbx'),
            
            // Lamp con materiali
            this.renderer.loadMesh('lamp', GAME_CONSTANTS.ASSETS.MODELS.LAMP || 'models/lamp.obj')
        ]);
        
        this.log('Mesh caricate con successo');
    }
    
    // Caricamento delle texture
    async loadTextures() {
        this.log('Caricamento texture...');
        
        await Promise.all([
            this.renderer.loadTexture('wall', GAME_CONSTANTS.ASSETS.TEXTURES.WALL || 'textures/wall.jpg'),
            this.renderer.loadTexture('floor', GAME_CONSTANTS.ASSETS.TEXTURES.FLOOR || 'textures/wood.jpg'),
            this.renderer.loadTexture('door', GAME_CONSTANTS.ASSETS.TEXTURES.DOOR || 'textures/door.png'),
            this.renderer.loadTexture('clock', GAME_CONSTANTS.ASSETS.TEXTURES.CLOCK || 'models/orologio-horror_baseColor.jpg'),
            this.renderer.loadTexture('doll', GAME_CONSTANTS.ASSETS.TEXTURES.DOLL || 'models/Doll_Doll_BaseColor.png'),
            this.renderer.loadTexture('switch', GAME_CONSTANTS.ASSETS.TEXTURES.SWITCH || 'textures/DefaultMaterial_Base_color.png'),
            this.renderer.loadTexture('skull', 'models/Skull.jpg'),
            // Usa la stessa texture della bambola per le sedie a rotelle
            this.renderer.loadTexture('wheelchair', 'models/Doll_Doll_BaseColor.png')
        ]);
        
        this.log('Texture caricate con successo');
    }
    
    // Configurazione della scena base
    setupScene() {
        this.log('Configurazione scena...');
        
        // Configura la stanza base
        // Pavimento
        this.scene.objects.set('floor', {
            mesh: 'plane',
            texture: 'floor',
            position: [0, -this.ROOM_HEIGHT/2, 0], // Y negativo
            rotation: [0, 0, 0],
            scale: [this.ROOM_WIDTH, 1, this.ROOM_DEPTH]
        });
        
        // Soffitto
        this.scene.objects.set('ceiling', {
            mesh: 'plane',
            texture: 'floor',
            position: [0, this.ROOM_HEIGHT/2, 0],
            rotation: [Math.PI, 0, 0],
            scale: [this.ROOM_WIDTH, 1, this.ROOM_DEPTH]
        });
        
        // Aggiungi pareti
        this.setupWalls();
        
        // Aggiungi illuminazione
        this.setupLighting();
        
        // Inizializza modelMatrix per tutti gli oggetti
        this.scene.objects.forEach(obj => {
            obj.modelMatrix = m4.identity();
            obj.modelViewMatrix = m4.identity();
        });
        
        this.log('Scena configurata con successo');
    }
    
// Configurazione delle pareti della stanza
setupWalls() {
    this.log('Iniziando setup pareti...');
    
    const wallTexture = 'wall';
    
    const createWall = (id, position, rotation, scale) => {
        this.scene.objects.set(id, {
            mesh: 'plane',
            texture: wallTexture,
            position,
            rotation,
            scale,
            doubleSided: true
        });
        this.log(`Parete ${id} creata a posizione [${position}], rotazione [${rotation}], scala [${scale}]`);
    };
    
    // Posizione corretta per le pareti - l'altezza è metà dell'altezza totale
    createWall('wallFront', 
        [0, this.ROOM_HEIGHT/2, -this.ROOM_DEPTH/2],
        [0, 0, 0],
        [this.ROOM_WIDTH, this.ROOM_HEIGHT, 1]
    );
    
    createWall('wallBack',
        [0, this.ROOM_HEIGHT/2, this.ROOM_DEPTH/2],
        [0, Math.PI, 0],
        [this.ROOM_WIDTH, this.ROOM_HEIGHT, 1]
    );
    
    createWall('wallLeft', 
        [-this.ROOM_WIDTH/2, this.ROOM_HEIGHT/2, 0],
        [0, Math.PI/2, 0],
        [this.ROOM_DEPTH, this.ROOM_HEIGHT, 1]
    );
    
    createWall('wallRight',
        [this.ROOM_WIDTH/2, this.ROOM_HEIGHT/2, 0],
        [0, -Math.PI/2, 0],
        [this.ROOM_DEPTH, this.ROOM_HEIGHT, 1]
    );
    
    // Aggiungi anche delle collisioni fisiche per la stanza
    this.physics.addCollisionBox(
        [-this.ROOM_WIDTH/2, 0, -this.ROOM_DEPTH/2], 
        [this.ROOM_WIDTH/2, this.ROOM_HEIGHT, this.ROOM_DEPTH/2]
    );
    
    // Verifica che le pareti siano state create
    this.log(`Numero di oggetti nella scena dopo setup pareti: ${this.scene.objects.size}`);
    if (this.scene.objects.has('wallFront') && 
        this.scene.objects.has('wallBack') && 
        this.scene.objects.has('wallLeft') && 
        this.scene.objects.has('wallRight')) {
        this.log('Tutte le pareti sono state aggiunte correttamente');
    } else {
        this.log('ERRORE: Alcune pareti non sono state aggiunte', true);
    }
    
    this.log('Setup pareti completato');
}
    
    // Configurazione dell'illuminazione
    setupLighting() {
        this.log('Configurazione illuminazione...');
    
        if (!this.scene) {
            this.scene = {
                lights: new Map(),
                objects: new Map()
            };
            this.log('Creata nuova scena con luci e oggetti');
        }
    
        // Luce principale (punto)
        const mainLight = {
            type: 'point',
            position: [0, this.ROOM_HEIGHT * 0.8, 0], // 80% dell'altezza della stanza
            color: GAME_CONSTANTS.LIGHTS.MAIN_LIGHT.COLOR || [1.0, 0.95, 0.8], // Luce calda
            intensity: GAME_CONSTANTS.LIGHTS.MAIN_LIGHT.INTENSITY || 150,
            enabled: true
        };
        
        // Luce ambientale per evitare zone troppo scure
        const ambientLight = {
            type: 'ambient',
            color: GAME_CONSTANTS.LIGHTS.AMBIENT_LIGHT.COLOR || [0.3, 0.3, 0.35], // Colore ambientale leggermente bluastro
            intensity: GAME_CONSTANTS.LIGHTS.AMBIENT_LIGHT.INTENSITY || 0.5
        };
    
        // Aggiungi controlli al pannello laterale
        const gui = new dat.GUI({ autoPlace: false });
        document.getElementById('gui-container').appendChild(gui.domElement);
    
        // Cartella per le impostazioni della luce
        const lightFolder = gui.addFolder('Light Settings');
        lightFolder.add(mainLight, 'intensity', 0, 200).name('Main Light Intensity')
            .onChange((value) => {
                mainLight.intensity = value;
                this.light.intensity = value;
                this.log('Intensità luce modificata: ' + value);
            });
    
        lightFolder.add(mainLight, 'enabled').name('Light Enabled')
            .onChange((value) => {
                mainLight.enabled = value;
                this.light.enabled = value;
                this.log('Stato luce modificato: ' + (value ? 'attiva' : 'disattiva'));
            });
    
        lightFolder.open();
    
        // Memorizza le luci nella scena
        this.scene.lights.set('mainLight', mainLight);
        this.scene.lights.set('ambient', ambientLight);
    
        // Aggiorna la luce del renderer
        this.light = {
            position: mainLight.position,
            color: mainLight.color,
            intensity: mainLight.intensity,
            enabled: mainLight.enabled
        };
    
        this.log('Illuminazione configurata con successo');
    }
    
    // Aggiunta degli oggetti interattivi alla scena
    addInteractiveObjects() {
        // Aggiungi oggetti interattivi alla scena
        this.addDoll();
        this.addWheelchairs();
        this.addSkulls();
        this.addClock();
        this.addLightSwitch();
        
        this.log('Oggetti interattivi aggiunti alla scena');
    }
    
    // Aggiunta della bambola inquietante
    addDoll() {
        // Posizione per la bambola
        this.scene.objects.set('doll', {
            mesh: 'doll',
            texture: 'doll',
            position: [
                this.ROOM_WIDTH/4,  // Un quarto della larghezza della stanza
                -this.ROOM_HEIGHT/2 + 0.5,  // Mezzo metro sopra il pavimento
                -this.ROOM_DEPTH/4  // Un quarto della profondità della stanza
            ],
            rotation: [0, Math.random() * Math.PI * 2, 0],
            scale: [1, 1, 1],
            interactive: true,
            proximityRadius: GAME_CONSTANTS.INTERACTION.DOLL_PROXIMITY || 5
        });
    }
    
    // Aggiunta delle sedie a rotelle
    addWheelchairs() {
        this.scene.objects.set('wheelchair1', {
            mesh: 'wheelchair1',
            texture: 'wheelchair',
            position: [-this.ROOM_WIDTH + 10.5, 0, -this.ROOM_DEPTH/2 + 8],
            rotation: [0, -Math.PI/2, 0],
            scale: [0.2, 0.2, 0.2]
        });
        
        this.scene.objects.set('wheelchair2', {
            mesh: 'wheelchair2',
            texture: 'wheelchair',
            position: [-this.ROOM_WIDTH/2 + 20, 0, -this.ROOM_DEPTH/2 + 8],
            rotation: [0, Math.PI/2, 0],
            scale: [0.2, 0.2, 0.2]
        });
    }
    
    // Aggiunta dell'orologio
    addClock() {
        this.scene.objects.set('clock', {
            mesh: 'clock',
            texture: 'clock',
            position: [-5, 2, -11.2], // Alzato sul muro
            rotation: [-Math.PI, -Math.PI/2, Math.PI],
            scale: [1, 1, 1]
        });
    }
    
    // Aggiunta dei teschi
    addSkulls() {
        const skullPositions = [
            { pos: [-8, 0, -11.0], rot: [-Math.PI/2, 0, 0] },
            { pos: [-8, 2, -10.8], rot: [-Math.PI/2 + 0.4, 0.2, 0.5] },
        ];
        
        skullPositions.forEach((skull, index) => {
            this.scene.objects.set(`skull${index}`, {
                mesh: 'skull',
                texture: 'skull',
                position: skull.pos,
                rotation: skull.rot,
                scale: [0.05, 0.05, 0.05]
            });
        });
    }
    
    // Aggiunta dell'interruttore della luce
    addLightSwitch() {
        this.scene.objects.set('switch', {
            mesh: 'switch',
            texture: 'switch',
            position: [-this.ROOM_WIDTH/2 + 0.1, this.ROOM_HEIGHT/2, this.ROOM_DEPTH/4],
            rotation: [0, Math.PI/2, 0],
            scale: [0.05, 0.05, 0.05],
            interactive: true,
            proximityRadius: GAME_CONSTANTS.INTERACTION.SWITCH_PROXIMITY || 2
        });
    }
    
    // Avvio del gioco
    start() {
        this.isRunning = true;
        this.isPaused = false; // Assicurati che non sia in pausa all'inizio
        this.audio.playStartMusic();
        
        // Forza un rendering iniziale
        this.render();
        
        // Forza un resize per assicurarsi che il canvas abbia le dimensioni corrette
        this.handleResize(window.innerWidth, window.innerHeight);
        
        // Avvia il game loop
        this.gameLoop();
        
        // Registra un messaggio di avvio
        this.log('Gioco avviato');
    }
    
    // Loop principale del gioco
    gameLoop() {
        if (!this.isRunning) {
            this.log('Game loop terminato: gioco non in esecuzione');
            return;
        }
        
        // Esegui sempre il rendering indipendentemente dallo stato di pausa
        this.render();
        
        if (!this.isPaused) {
            // Aggiorna input
            this.input.update();
            
            // Aggiorna fisica
            this.updatePhysics();
            
            // Aggiorna logica di gioco
            this.update();
        }
        
        // Programma il prossimo frame
        requestAnimationFrame(() => this.gameLoop());
    }
    
    // Aggiornamento della fisica
    updatePhysics() {
        // Aggiorna la fisica del giocatore
        const newPosition = this.physics.update(1/60, this.player.position);
        this.player.position = newPosition;
        
        // Controlla se il giocatore è fuori dai limiti
        const teleportResult = this.physics.teleportPlayerIfOob(this.player.position);
        if (teleportResult) {
            this.player.position = teleportResult.position;
            this.player.rotation = teleportResult.rotation;
        }
    }
    
    // Aggiornamento della logica di gioco
    update() {
        // Aggiorna le interazioni con gli oggetti
        this.checkObjectInteractions();
        
        // Aggiorna l'audio in base alla prossimità
        this.updateProximityAudio();
        
        // Aggiorna la camera
        this.updateCamera();
    }
    
    // Controllo delle interazioni con gli oggetti
    checkObjectInteractions() {
        for (const [id, object] of this.scene.objects) {
            if (object.interactive) {
                const distance = this.getDistanceToPlayer(object.position);
                
                if (distance < object.proximityRadius) {
                    if (id === 'doll') {
                        this.handleDollProximity();
                    } else if (id === 'switch') {
                        this.handleSwitchProximity();
                    }
                } else if (id === 'switch') {
                    // Nascondi le istruzioni quando ci allontaniamo dall'interruttore
                    document.getElementById('instructions').style.visibility = 'hidden';
                    document.getElementById('crosshair').style.backgroundImage = "url('images/crosshair.png')";
                }
            }
        }
    }
    
    // Calcola la distanza tra il giocatore e un oggetto
    getDistanceToPlayer(objectPosition) {
        return Math.sqrt(
            Math.pow(this.player.position[0] - objectPosition[0], 2) +
            Math.pow(this.player.position[1] - objectPosition[1], 2) +
            Math.pow(this.player.position[2] - objectPosition[2], 2)
        );
    }
    
    // Gestione dell'interazione con la bambola
    handleDollProximity() {
        // Attiva suoni inquietanti se la luce è spenta
        if (!this.isLightOn) {
            this.audio.playProximitySound(true, true);
        }
    }
    
    // Gestione dell'interazione con l'interruttore
    handleSwitchProximity() {
        // Mostra istruzioni per l'interruttore
        document.getElementById('instructions').style.visibility = 'visible';
        document.getElementById('crosshair').style.backgroundImage = "url('images/crosshair-selection.png')";
    }
    
    // Aggiornamento dell'audio in base alla prossimità
    updateProximityAudio() {
        // Aggiorna l'audio in base alla posizione del giocatore
        const dollObject = this.scene.objects.get('doll');
        if (dollObject) {
            const distance = this.getDistanceToPlayer(dollObject.position);
            this.audio.playProximitySound(distance < dollObject.proximityRadius, !this.isLightOn);
        }
    }
    
// Aggiornamento della camera
updateCamera() {
    // Sincronizza posizione camera con player
    this.camera.position = [...this.player.position];
    
    // Calcola il punto di mira in base alla rotazione
    const target = [
        this.player.position[0] + Math.sin(this.camera.rotation.y),
        this.player.position[1] + Math.sin(this.camera.rotation.x),
        this.player.position[2] - Math.cos(this.camera.rotation.y)
    ];

    // Aggiorna la matrice di vista nel renderer
    if (this.renderer) {
        this.renderer.updateCamera(
            this.player.position,
            target,
            [0, 1, 0]
        );
        
        // Forza rendering
        this.render();
    }
    
    this.log(`Camera aggiornata - pos: [${this.player.position}], rot: [${this.camera.rotation.x.toFixed(2)}, ${this.camera.rotation.y.toFixed(2)}]`);
}
    
    // Configurazione controlli mouse
    setupMouseControls() {
        const canvas = document.getElementById('canvas');
    
        canvas.addEventListener('click', () => {
            if (!document.pointerLockElement) {
                canvas.requestPointerLock();
            }
        });
    
        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement === canvas) {
                document.body.style.cursor = 'none';
                this.isPaused = false;
            } else if (!document.getElementById('side-panel').classList.contains('visible')) {
                document.body.style.cursor = 'default';
                this.isPaused = true;
            }
        });
    
        document.addEventListener('mousemove', (event) => {
            if (document.pointerLockElement === canvas) {
                this.camera.rotation.y -= event.movementX / 500;
                this.camera.rotation.x -= event.movementY / 500;
                this.camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.camera.rotation.x));
            }
        });
    }
    
    // Renderizzazione della scena
    render() {
        // Renderizza la scena
        this.renderer.render(this.scene);
    }
    
    // Toggle del pannello di controllo
    togglePanel() {
        const panel = document.getElementById('side-panel');
        const isVisible = panel.classList.contains('visible');
        
        this.log('Toggle pannello: ' + (isVisible ? 'chiusura' : 'apertura'));
     
        if (isVisible) {
            panel.classList.remove('visible');
            panel.classList.add('hidden');
            this.canvas.requestPointerLock();
            document.body.style.cursor = 'none';
        } else {
            panel.classList.remove('hidden');
            panel.classList.add('visible');
            document.exitPointerLock();
            document.body.style.cursor = 'default';
        }
        
        this.isPaused = !isVisible;
    }
     
    // Toggle della luce
    toggleLight() {
        this.log('Tentativo toggle luce: ' + 
                 'canToggle=' + this.canToggleLight + 
                 ', isFlickering=' + this.isLightFlickering + 
                 ', currentState=' + this.isLightOn);
     
        if (this.canToggleLight && !this.isLightFlickering) {
            this.isLightOn = !this.isLightOn;
            this.isLightFlickering = true;
            
            this.log('Stato luce cambiato: ' + (this.isLightOn ? 'accesa' : 'spenta'));
     
            this.renderer.setLightEnabled(this.isLightOn);
            
            setTimeout(() => {
                this.isLightFlickering = false;
                this.log('Effetto sfarfallio terminato');
            }, GAME_CONSTANTS.LIGHTS.MAIN_LIGHT.FLICKER_DURATION || 500);
        }
    }
    
// Nel metodo updateCameraRotation
updateCameraRotation(deltaX, deltaY) {
    // Aggiunta di log per debugging
    this.log(`Updating camera rotation: deltaX=${deltaX}, deltaY=${deltaY}`);
    
    // Rotazione orizzontale - il negativo crea un movimento più intuitivo
    this.camera.rotation.y -= deltaX;
    
    // Rotazione verticale
    this.camera.rotation.x -= deltaY;
    
    // Limita la rotazione verticale
    this.camera.rotation.x = Math.max(
        -Math.PI / 2 + 0.1, 
        Math.min(Math.PI / 2 - 0.1, this.camera.rotation.x)
    );
    
    // Forza un rendering dopo l'aggiornamento della camera
    this.updateCamera();
}
    
// Movimento del giocatore
movePlayer(direction, speed) {
    // Calcola la direzione di movimento sul piano XZ
    const yaw = this.camera.rotation.y;
    let moveX = 0;
    let moveZ = 0;

    switch(direction) {
        case 'forward':
            moveX = Math.sin(yaw) * speed;
            moveZ = -Math.cos(yaw) * speed;
            break;
        case 'backward':
            moveX = -Math.sin(yaw) * speed;
            moveZ = Math.cos(yaw) * speed;
            break;
        case 'left':
            moveX = -Math.cos(yaw) * speed;
            moveZ = -Math.sin(yaw) * speed;
            break;
        case 'right':
            moveX = Math.cos(yaw) * speed;
            moveZ = Math.sin(yaw) * speed;
            break;
    }

    // Verifica valori validi
    if (isNaN(moveX) || isNaN(moveZ)) {
        this.log(`Movimento non valido: moveX=${moveX}, moveZ=${moveZ}, yaw=${yaw}`, true);
        return;
    }

    // Aggiorna posizione player
    this.player.position[0] += moveX;
    this.player.position[2] += moveZ;
    
    // Log di movimento
    this.log(`Movimento: dir=${direction}, yaw=${yaw.toFixed(2)}, moveX=${moveX.toFixed(2)}, moveZ=${moveZ.toFixed(2)}`);
    this.log(`Nuova posizione: [${this.player.position[0].toFixed(2)}, ${this.player.position[1].toFixed(2)}, ${this.player.position[2].toFixed(2)}]`);

    // Aggiorna la camera per seguire il movimento
    this.updateCamera();
}
    
    // Salto del giocatore
    playerJump() {
        this.physics.jump();
        this.log('Giocatore salta');
    }
    
    // Setup degli event listeners
    setupEventListeners() {
        // Gestione del ridimensionamento della finestra
        window.addEventListener('resize', () => {
            this.renderer.onWindowResize();
        });
        
        // Gestione del pulsante di avvio
        const startButton = document.getElementById('start-button');
        startButton.addEventListener('click', () => {
            // Nascondi il menu iniziale
            document.getElementById('start-menu').style.display = 'none';
            
            // Mostra gli elementi di gioco
            this.canvas.style.display = 'block';
            this.container.style.display = 'block';
            document.getElementById('side-panel').style.display = 'block';
            document.getElementById('instructions').style.display = 'block';
            document.getElementById('crosshair').style.display = 'block';
            document.getElementById('top-bar').style.display = 'flex';
            
            // Avvia la musica e il gioco
            this.audio.playIntroMusic();
            this.audio.stopIntroMusic();
            this.audio.playStartMusic();
            
            // Blocca il puntatore
            setTimeout(() => {
                this.canvas.requestPointerLock();
                document.body.style.cursor = 'none';
            }, 100);
            
            // Mostra i controlli e avvia il gioco
            this.showGameControls();
            this.start();
        });
        
        // Gestione del click sul canvas per il pointer lock
        this.canvas.addEventListener('click', () => {
            if (!document.pointerLockElement) {
                this.canvas.requestPointerLock();
            }
        });
        
        // Gestione del cambiamento dello stato del pointer lock
        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement === this.canvas) {
                document.body.style.cursor = 'none';
                this.isPaused = false;
            } else if (!document.getElementById('side-panel').classList.contains('visible')) {
                document.body.style.cursor = 'default';
                this.isPaused = true;
            }
        });

            // Aggiungi gestore per quando la tab diventa visibile/invisibile
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Tab nascosto
                this.pause();
            } else {
                // Tab tornato visibile - forza un re-rendering
                if (this.renderer) {
                    // Assicurati che tutto sia correttamente dimensionato
                    this.renderer.onWindowResize();
                    // Forza un rendering
                    this.render();
                }
                
                // Riprendi solo se era in esecuzione prima
                if (this.isRunning && this.isPaused) {
                    this.resume();
                }
            }
        });
        
        // Gestione degli eventi touch per dispositivi mobili
        this.setupTouchEvents();
    }
    
    // Setup degli eventi touch
    setupTouchEvents() {
        let initialTouchX = 0;
        let initialTouchY = 0;
        let initialPinchDistance = 0;
        
        this.canvas.addEventListener('touchstart', (event) => {
            if (event.touches.length === 1) {
                initialTouchX = event.touches[0].clientX;
                initialTouchY = event.touches[0].clientY;
            } else if (event.touches.length === 2) {
                initialPinchDistance = Math.hypot(
                    event.touches[0].clientX - event.touches[1].clientX,
                    event.touches[0].clientY - event.touches[1].clientY
                );
            }
        });
        
        this.canvas.addEventListener('touchmove', (event) => {
            event.preventDefault();
            
            if (event.touches.length === 1) {
                // Rotazione camera
                const touchX = event.touches[0].clientX;
                const touchY = event.touches[0].clientY;
                
                const deltaX = (touchX - initialTouchX) * 0.005;
                const deltaY = (touchY - initialTouchY) * 0.005;
                
                this.updateCameraRotation(deltaX, deltaY);
                
                initialTouchX = touchX;
                initialTouchY = touchY;
            } else if (event.touches.length === 2) {
                // Zoom con pinch
                const currentDistance = Math.hypot(
                    event.touches[0].clientX - event.touches[1].clientX,
                    event.touches[0].clientY - event.touches[1].clientY
                );
                
                const delta = (initialPinchDistance - currentDistance) * 0.01;
                this.renderer.updateCameraFOV(delta);
                
                initialPinchDistance = currentDistance;
            }
        });
        
        // Aggiungi pulsanti di movimento virtuali per mobile
        this.setupMobileControls();
    }
    
    // Setup dei controlli mobile
    setupMobileControls() {
        const mobileControls = document.createElement('div');
        mobileControls.id = 'mobile-controls';
        mobileControls.className = 'mobile-only';
        
        const controls = [
            { id: 'move-forward', text: '↑', touch: () => this.movePlayer('forward', 0.15) },
            { id: 'move-backward', text: '↓', touch: () => this.movePlayer('backward', 0.15) },
            { id: 'move-left', text: '←', touch: () => this.movePlayer('left', 0.15) },
            { id: 'move-right', text: '→', touch: () => this.movePlayer('right', 0.15) },
            { id: 'toggle-light', text: 'L', touch: () => this.toggleLight() },
            { id: 'jump', text: '↑↑', touch: () => this.playerJump() }
        ];
        
        controls.forEach(control => {
            const button = document.createElement('button');
            button.id = control.id;
            button.textContent = control.text;
            
            button.addEventListener('touchstart', (e) => {
                e.preventDefault();
                control.touch();
            });
            
            mobileControls.appendChild(button);
        });
        
        document.body.appendChild(mobileControls);
    }
    
    // Mostra i controlli del gioco
    showGameControls() {
        const gameControls = document.getElementById('game-controls');
        gameControls.innerHTML = `
            W: Move Forward | 
            S: Move Backward | 
            A: Move Left | 
            D: Move Right | 
            F: Toggle Light | 
            P: Open/Close Control Panel
        `;
    }
    
    // Gestione del ridimensionamento
    handleResize(width, height) {
        if (this.renderer) {
            this.renderer.onWindowResize();
            // Forza un nuovo rendering dopo il resize
            this.render();
        }
        this.updateCamera();
        this.log(`Ridimensionamento a ${width}x${height}`);
    }
    
    // Pausa del gioco
    pause() {
        if (this.isRunning && !this.isPaused) {
            this.isPaused = true;
            this.log('Gioco in pausa');
            
            // Ferma l'audio solo se necessario
            if (this.audio) {
                this.audio.stopAll();
            }
            
            // Non uscire da pointer lock automaticamente
            // document.exitPointerLock();
        }
    }
    
    // Ripresa del gioco
    resume() {
        if (this.isPaused) {
            this.isPaused = false;
            this.log('Gioco ripreso');
            
            // Riavvia l'audio solo se necessario
            if (this.audio && this.isLightOn) {
                this.audio.playStartMusic();
            }
            
            // Non richiedere pointer lock automaticamente
            // this.canvas.requestPointerLock();
        }
    }
    
    // Reinizializzazione (dopo perdita contesto WebGL)
    async reinitialize() {
        this.pause();
        
        try {
            // Reinizializza il renderer
            if (this.renderer) {
                await this.renderer.initialize();
            }
            
            // Ricarica le mesh e le texture
            await this.loadMeshes();
            await this.loadTextures();
            
            // Riconfigura la scena
            this.setupScene();
            this.addInteractiveObjects();
            
            this.resume();
            this.log('Gioco reinizializzato con successo');
            return true;
        } catch (error) {
            this.log('Errore durante la reinizializzazione: ' + error, true);
            return false;
        }
    }
    
    // Ottieni lo stato attuale del gioco (per debug)
    getState() {
        return {
            player: this.player,
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            isLightOn: this.isLightOn,
            camera: this.camera,
            sceneObjects: Array.from(this.scene.objects.keys())
        };
    }
    
    // Toggle vista debug
    toggleDebugView() {
        if (this.renderer) {
            this.renderer.settings.debug.renderingSteps = !this.renderer.settings.debug.renderingSteps;
            this.renderer.settings.debug.playerPosition = !this.renderer.settings.debug.playerPosition;
            this.log('Debug view: ' + (this.renderer.settings.debug.renderingSteps ? 'on' : 'off'));
        }
        return this.renderer ? this.renderer.settings.debug : null;
    }
}

// Rendi disponibile globalmente
window.Game = Game;