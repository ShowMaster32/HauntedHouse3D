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
        
        // Collisioni attive
        this.boundingBoxes = [];
        
        // Vettore velocità del player
        this.playerVelocity = [0, 0, 0];
        
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
        
        try {
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
        } catch (error) {
            this.log('Errore nel caricamento delle mesh: ' + error, true);
            // Crea un piano come fallback per ogni mesh che non si è caricata
            this.createFallbackMeshes();
        }
    }
    
    // Creazione mesh di fallback
    createFallbackMeshes() {
        this.log('Creazione mesh di fallback per sostituire quelle mancanti');
        
        // Crea una mesh di base per i fallback
        const planeMesh = this.renderer.createPlaneMesh();
        
        // Assegna questa mesh a tutti i tipi che potrebbero non essere stati caricati
        const meshTypes = ['clock', 'doll', 'wheelchair1', 'wheelchair2', 'skull', 'switch', 'lamp'];
        
        meshTypes.forEach(type => {
            if (!this.renderer.meshes.has(type)) {
                this.renderer.meshes.set(type, planeMesh);
                this.log(`Creata mesh fallback per: ${type}`);
            }
        });
    }
    
    // Creazione texture di fallback
    createFallbackTextures() {
        this.log('Creazione texture di fallback');
        
        // Lista di texture necessarie
        const textureTypes = ['wall', 'floor', 'door', 'clock', 'doll', 'switch', 'skull', 'wheelchair'];
        
        textureTypes.forEach(type => {
            if (!this.renderer.textures.has(type)) {
                // Crea una texture di base (rossa) come fallback
                const gl = this.renderer.gl;
                const texture = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, texture);
                
                // Imposta una texture rossa 2x2
                const pixels = new Uint8Array([
                    255, 0, 0, 255,  // Rosso
                    200, 0, 0, 255,  // Rosso più scuro
                    200, 0, 0, 255,  // Rosso più scuro
                    255, 0, 0, 255   // Rosso
                ]);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                
                // Imposta i parametri della texture
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                
                // Memorizza la texture
                this.renderer.textures.set(type, texture);
                this.log(`Creata texture fallback per: ${type}`);
            }
        });
    }
    
    // Caricamento delle texture
    async loadTextures() {
        this.log('Caricamento texture...');
        
        try {
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
        } catch (error) {
            this.log('Errore nel caricamento delle texture: ' + error, true);
            this.createFallbackTextures();
        }
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
        this.boundingBoxes = [
            // Pavimento
            {
                min: [-this.ROOM_WIDTH/2, -this.ROOM_HEIGHT/2, -this.ROOM_DEPTH/2],
                max: [this.ROOM_WIDTH/2, -this.ROOM_HEIGHT/2 + 0.1, this.ROOM_DEPTH/2]
            },
            // Soffitto
            {
                min: [-this.ROOM_WIDTH/2, this.ROOM_HEIGHT/2 - 0.1, -this.ROOM_DEPTH/2],
                max: [this.ROOM_WIDTH/2, this.ROOM_HEIGHT/2, this.ROOM_DEPTH/2]
            },
            // Parete frontale
            {
                min: [-this.ROOM_WIDTH/2, -this.ROOM_HEIGHT/2, -this.ROOM_DEPTH/2],
                max: [this.ROOM_WIDTH/2, this.ROOM_HEIGHT/2, -this.ROOM_DEPTH/2 + this.WALL_THICKNESS]
            },
            // Parete posteriore
            {
                min: [-this.ROOM_WIDTH/2, -this.ROOM_HEIGHT/2, this.ROOM_DEPTH/2 - this.WALL_THICKNESS],
                max: [this.ROOM_WIDTH/2, this.ROOM_HEIGHT/2, this.ROOM_DEPTH/2]
            },
            // Parete sinistra
            {
                min: [-this.ROOM_WIDTH/2, -this.ROOM_HEIGHT/2, -this.ROOM_DEPTH/2],
                max: [-this.ROOM_WIDTH/2 + this.WALL_THICKNESS, this.ROOM_HEIGHT/2, this.ROOM_DEPTH/2]
            },
            // Parete destra
            {
                min: [this.ROOM_WIDTH/2 - this.WALL_THICKNESS, -this.ROOM_HEIGHT/2, -this.ROOM_DEPTH/2],
                max: [this.ROOM_WIDTH/2, this.ROOM_HEIGHT/2, this.ROOM_DEPTH/2]
            }
        ];
        
        this.physics.boundingBoxes = this.boundingBoxes;
        
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
        const guiContainer = document.getElementById('gui-container');
        if (guiContainer) {
            guiContainer.appendChild(gui.domElement);
        }
    
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
            position: [-this.ROOM_WIDTH/2 + 5, -this.ROOM_HEIGHT/2 + 0.5, -this.ROOM_DEPTH/2 + 8],
            rotation: [0, -Math.PI/2, 0],
            scale: [0.2, 0.2, 0.2]
        });
        
        this.scene.objects.set('wheelchair2', {
            mesh: 'wheelchair2',
            texture: 'wheelchair',
            position: [this.ROOM_WIDTH/2 - 5, -this.ROOM_HEIGHT/2 + 0.5, -this.ROOM_DEPTH/2 + 8],
            rotation: [0, Math.PI/2, 0],
            scale: [0.2, 0.2, 0.2]
        });
    }
    
    // Aggiunta dell'orologio
    addClock() {
        this.scene.objects.set('clock', {
            mesh: 'clock',
            texture: 'clock',
            position: [-5, this.ROOM_HEIGHT/2 - 2, -this.ROOM_DEPTH/2 + 0.5], // Sul muro
            rotation: [-Math.PI, -Math.PI/2, Math.PI],
            scale: [1, 1, 1]
        });
    }
    
    // Aggiunta dei teschi
    addSkulls() {
        const skullPositions = [
            { pos: [-8, -this.ROOM_HEIGHT/2 + 1, -this.ROOM_DEPTH/2 + 0.5], rot: [-Math.PI/2, 0, 0] },
            { pos: [-8, -this.ROOM_HEIGHT/2 + 2, -this.ROOM_DEPTH/2 + 0.5], rot: [-Math.PI/2 + 0.4, 0.2, 0.5] },
            { pos: [8, -this.ROOM_HEIGHT/2 + 1, -this.ROOM_DEPTH/2 + 0.5], rot: [-Math.PI/2, 0, 0] },
            { pos: [0, -this.ROOM_HEIGHT/2 + 0.5, this.ROOM_DEPTH/2 - 0.5], rot: [Math.PI/2, Math.PI, 0] }
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
        // Posizione per l'interruttore (vicino alla porta)
        this.scene.objects.set('switch', {
            mesh: 'switch',
            texture: 'switch',
            position: [-this.ROOM_WIDTH/2 + 0.5, 0, 0], // Vicino alla parete di sinistra
            rotation: [0, Math.PI/2, 0],
            scale: [0.05, 0.05, 0.05],
            interactive: true,
            proximityRadius: GAME_CONSTANTS.INTERACTION.SWITCH_PROXIMITY || 2
        });
        
        // Memorizza la posizione dell'interruttore per riferimento
        this.switchPosition = [-this.ROOM_WIDTH/2 + 0.5, 0, 0];
    }
    
    // Setup degli event listeners
    setupEventListeners() {
        // Gestione del ridimensionamento della finestra
        window.addEventListener('resize', () => {
            this.handleResize(window.innerWidth, window.innerHeight);
        });
        
        // Gestione del pulsante di pannello di controllo (tasto P)
        document.addEventListener('keydown', (event) => {
            if (event.code === 'KeyP') {
                this.togglePanel();
            }
            
            // Gestione luce (tasto F)
            if (event.code === 'KeyF' && this.canToggleLight) {
                this.toggleLight();
                this.canToggleLight = false; // Previene il toggle continuo
            }
        });
        
        document.addEventListener('keyup', (event) => {
            // Reset del flag per la luce
            if (event.code === 'KeyF') {
                this.canToggleLight = true;
            }
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

        // Gestione visibilità pagina
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
        
        // Gestione movimenti mouse per rotazione camera
        document.addEventListener('mousemove', (event) => {
            if (document.pointerLockElement === this.canvas) {
                const sensitivity = GAME_CONSTANTS.CAMERA.SENSITIVITY || 0.002;
                const deltaX = event.movementX * sensitivity;
                const deltaY = event.movementY * sensitivity;
                
                this.updateCameraRotation(deltaX, deltaY);
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
                
                // Verifica se il tocco è vicino all'interruttore
                if (this.isNearSwitch()) {
                    this.toggleLight();
                }
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
                
                if (initialPinchDistance > 0) {
                    const delta = (initialPinchDistance - currentDistance) * 0.01;
                    if (this.renderer) {
                        this.renderer.updateCameraFOV(delta);
                    }
                }
                
                initialPinchDistance = currentDistance;
            }
        });
        
        // Aggiungi pulsanti di movimento virtuali per mobile
        this.setupMobileControls();
    }
    
    // Setup dei controlli mobile
    setupMobileControls() {
        let mobileControls = document.getElementById('mobile-controls');
        
        // Se non esiste, crealo
        if (!mobileControls) {
            mobileControls = document.createElement('div');
            mobileControls.id = 'mobile-controls';
            mobileControls.className = 'mobile-only';
            document.body.appendChild(mobileControls);
        }
        
        // Pulisci eventuali controlli esistenti
        mobileControls.innerHTML = '';
        
        const controls = [
            { id: 'move-forward', text: '↑', touch: () => this.movePlayer('forward', 0.15) },
            { id: 'move-backward', text: '↓', touch: () => this.movePlayer('backward', 0.15) },
            { id: 'move-left', text: '←', touch: () => this.movePlayer('left', 0.15) },
            { id: 'move-right', text: '→', touch: () => this.movePlayer('right', 0.15) },
            { id: 'toggle-light', text: 'L', touch: () => this.toggleLight() },
            { id: 'toggle-panel', text: 'P', touch: () => this.togglePanel() }
        ];
        
        controls.forEach(control => {
            const button = document.createElement('button');
            button.id = control.id;
            button.textContent = control.text;
            
            // Evento touch start per movimento continuo
            button.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                control.touch();
                
                // Per movimenti, imposta un interval per continuare il movimento
                if (control.id.includes('move')) {
                    button.interval = setInterval(() => {
                        control.touch();
                    }, 100);
                }
            });
            
            // Stop al movimento quando il tocco finisce
            button.addEventListener('touchend', () => {
                if (button.interval) {
                    clearInterval(button.interval);
                    button.interval = null;
                }
            });
            
            mobileControls.appendChild(button);
        });
    }
    
    // Verifica se il giocatore è vicino all'interruttore
    isNearSwitch() {
        if (!this.switchPosition) return false;
        
        const distance = this.getDistance(this.player.position, this.switchPosition);
        return distance < GAME_CONSTANTS.INTERACTION.SWITCH_PROXIMITY;
    }
    
    // Calcola la distanza tra due punti 3D
    getDistance(point1, point2) {
        return Math.sqrt(
            Math.pow(point2[0] - point1[0], 2) +
            Math.pow(point2[1] - point1[1], 2) +
            Math.pow(point2[2] - point1[2], 2)
        );
    }
    
    // Avvio del gioco
    start() {
        this.isRunning = true;
        this.isPaused = false; // Assicurati che non sia in pausa all'inizio
        
        // Avvia l'audio se è disponibile
        if (this.audio) {
            this.audio.playStartMusic();
        }
        
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
        
        // Aggiorna stats se disponibile
        if (window.gameApp && window.gameApp.stats) {
            window.gameApp.stats.begin();
        }
        
        // Esegui sempre il rendering indipendentemente dallo stato di pausa
        this.render();
        
        if (!this.isPaused) {
            // Aggiorna input
            if (this.input) this.input.update();
            
            // Aggiorna fisica (posizione del giocatore)
            this.updatePhysics();
            
            // Aggiorna logica di gioco
            this.update();
        }
        
        // Aggiorna stats
        if (window.gameApp && window.gameApp.stats) {
            window.gameApp.stats.end();
        }
        
        // Programma il prossimo frame
        requestAnimationFrame(() => this.gameLoop());
    }
    
    // Aggiornamento della fisica
    updatePhysics() {
        // Aggiorna la fisica del giocatore
        const newPosition = this.physics.update(1/60, this.player.position, this.playerVelocity);
        
        // Aggiorna la posizione del giocatore
        this.player.position = newPosition.position;
        this.playerVelocity = newPosition.velocity;
        this.player.onFloor = newPosition.onFloor;
        
        // Controlla se il giocatore è fuori dai limiti
        const teleportResult = this.physics.teleportPlayerIfOob(this.player.position);
        if (teleportResult) {
            this.player.position = teleportResult.position;
            this.player.rotation = teleportResult.rotation;
            // Aggiorna anche la posizione della camera
            this.camera.position = [...this.player.position];
            this.camera.rotation = { 
                x: this.player.rotation[0], 
                y: this.player.rotation[1], 
                z: this.player.rotation[2] 
            };
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
        // Per ogni oggetto interattivo, controlla la prossimità
        for (const [id, object] of this.scene.objects) {
            if (object.interactive) {
                const distance = this.getDistance(this.player.position, object.position);
                
                if (distance < (object.proximityRadius || 2)) {
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
    
    // Gestione dell'interazione con la bambola
    handleDollProximity() {
        // Attiva suoni inquietanti se la luce è spenta
        if (!this.isLightOn && this.audio) {
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
        if (dollObject && this.audio) {
            const distance = this.getDistance(this.player.position, dollObject.position);
            this.audio.playProximitySound(distance < (dollObject.proximityRadius || 5), !this.isLightOn);
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
    }
    
    // Aggiornamento della rotazione della camera
    updateCameraRotation(deltaX, deltaY) {
        // Rotazione orizzontale - il negativo crea un movimento più intuitivo
        this.camera.rotation.y -= deltaX;
        
        // Rotazione verticale
        this.camera.rotation.x -= deltaY;
        
        // Limita la rotazione verticale
        this.camera.rotation.x = Math.max(
            -Math.PI / 2 + 0.1, 
            Math.min(Math.PI / 2 - 0.1, this.camera.rotation.x)
        );
        
        // Forza un aggiornamento della camera
        this.updateCamera();
    }
    
    // Movimento del giocatore - versione corretta
    movePlayer(direction, speed) {
        // Log di input
        this.log(`Tentativo movimento: ${direction} con velocità ${speed}`);
        
        // Valida la rotazione della camera
        if (!this.camera || typeof this.camera.rotation !== 'object' || typeof this.camera.rotation.y !== 'number') {
            this.log('Rotazione camera non valida per calcolo movimento', true);
            return;
        }
        
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
            default:
                this.log(`Direzione non valida: ${direction}`, true);
                return;
        }

        // Verifica valori validi
        if (isNaN(moveX) || isNaN(moveZ)) {
            this.log(`Movimento non valido: moveX=${moveX}, moveZ=${moveZ}, yaw=${yaw}`, true);
            // Imposta valori di default sicuri
            moveX = 0;
            moveZ = direction === 'forward' ? -speed : 
                    direction === 'backward' ? speed : 
                    direction === 'left' ? -speed : 
                    direction === 'right' ? speed : 0;
        }

        // Log di movimento per debug
        this.log(`Movimento: dir=${direction}, yaw=${yaw.toFixed(2)}, moveX=${moveX.toFixed(2)}, moveZ=${moveZ.toFixed(2)}`);
        
        // Calcola la nuova posizione
        const newX = this.player.position[0] + moveX;
        const newZ = this.player.position[2] + moveZ;
        
        // Verifica collisioni prima di aggiornare la posizione
        const playerRadius = this.PLAYER_RADIUS || 0.35;
        let canMove = true;
        
        // Controlla se ci sono collisioni con le bounding box
        if (this.boundingBoxes && this.boundingBoxes.length > 0) {
            // Creiamo una mini bounding box per il giocatore
            const playerMin = [
                newX - playerRadius,
                this.player.position[1],
                newZ - playerRadius
            ];
            
            const playerMax = [
                newX + playerRadius,
                this.player.position[1] + (this.PLAYER_HEIGHT || 1.7),
                newZ + playerRadius
            ];
            
            // Verifica collisioni con tutte le bounding box
            for (const box of this.boundingBoxes) {
                // Semplice test AABB (Axis-Aligned Bounding Box)
                if (playerMin[0] <= box.max[0] && playerMax[0] >= box.min[0] &&
                    playerMin[1] <= box.max[1] && playerMax[1] >= box.min[1] &&
                    playerMin[2] <= box.max[2] && playerMax[2] >= box.min[2]) {
                    canMove = false;
                    break;
                }
            }
        }
        
        if (canMove) {
            // Aggiorna sia la velocità per la fisica
            this.playerVelocity[0] += moveX;
            this.playerVelocity[2] += moveZ;
            
            // E anche la posizione direttamente per un movimento più immediato
            this.player.position[0] = newX;
            this.player.position[2] = newZ;
            
            // Forza un update della camera
            this.updateCamera();
        } else {
            this.log(`Movimento bloccato da collisione: ${direction}`);
        }
        
        return canMove;
    }
    
    // Salto del giocatore
    playerJump() {
        if (this.player.onFloor) {
            this.playerVelocity[1] = GAME_CONSTANTS.PHYSICS.JUMP_FORCE || 10;
            this.log('Giocatore salta');
        }
    }
    
    // Renderizzazione della scena
    render() {
        if (!this.renderer) return;
        
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
     
            if (this.renderer) {
                this.renderer.setLightEnabled(this.isLightOn);
            }
            
            setTimeout(() => {
                this.isLightFlickering = false;
                this.log('Effetto sfarfallio terminato');
            }, GAME_CONSTANTS.LIGHTS.MAIN_LIGHT.FLICKER_DURATION || 500);
        }
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
}

// Rendi disponibile globalmente
window.Game = Game;