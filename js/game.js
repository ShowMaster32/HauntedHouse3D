// game.js
class Game {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.container = document.getElementById('container');
        
        // Inizializza i sottosistemi
        this.physics = new PhysicsSystem();
        this.audio = new AudioManager();
        this.input = new InputHandler(this);
        
        // Stato del gioco
        this.isRunning = false;
        this.isPaused = false;
        this.isLightOn = true;
        this.isLightFlickering = false;
        this.canToggleLight = true;
        
        // Costanti della stanza
        this.ROOM_WIDTH = 20;
        this.ROOM_HEIGHT = 10;
        this.ROOM_DEPTH = 25;
        this.WALL_THICKNESS = 0.1;
        
        // Stato del giocatore - modifica posizione iniziale per vedere meglio la stanza
        this.player = {
            position: [0, 2, 10], // Mettiamo il player a un'altezza più ragionevole e più indietro
            rotation: [0, 0, 0],
            onFloor: true
        };
        
        // Imposta la camera iniziale
        this.camera = {
            position: [0, 2, 10],
            target: [0, 2, 0], // Guarda verso il centro della stanza
            up: [0, 1, 0],
            fov: 70 * Math.PI / 180,
            near: 0.1,
            far: 1000,
            rotation: [0, 0, 0]
        };
        
        // Modifica l'intensità della luce
        this.light = {
            position: [0, 8, 0],  // Luce più alta
            color: [1, 1, 1],     // Luce bianca
            intensity: 300,       // Intensità maggiore
            enabled: true
        };
        
        // Elementi della scena
        this.scene = {
            objects: new Map(),
            lights: new Map()
        };
        
        // Setup degli event listeners
        this.setupEventListeners();
    }
    
    async initialize() {
        try {
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
            
            return true;
        } catch (error) {
            console.error('Errore durante l\'inizializzazione del gioco:', error);
            throw error;
        }
    }
    
    async initializeGame() {
        try {
            // Inizializza la fisica della stanza
            this.physics.initializeCollisionGeometry(
                this.ROOM_WIDTH,
                this.ROOM_HEIGHT,
                this.ROOM_DEPTH,
                this.WALL_THICKNESS
            );
            
            // Carica le mesh
            await this.loadMeshes();
            
            // Carica le texture
            await this.loadTextures();
            
            // Configura la scena
            this.setupScene();
            
            // Aggiungi gli oggetti interattivi
            this.addInteractiveObjects();
            
            // Imposta l'audio di intro
            this.audio.playIntroMusic();
            
        } catch (error) {
            console.error('Errore durante l\'inizializzazione del gioco:', error);
        }
    }
    
    async loadMeshes() {
        // Carica tutte le mesh necessarie
        await Promise.all([
            this.renderer.loadMesh('clock', 'models/pendent-clock.obj'),
            this.renderer.loadMesh('doll', 'models/doll.obj'),
            this.renderer.loadMesh('wheelchair1', 'models/kurumaisu.unity_1.obj'),
            this.renderer.loadMesh('wheelchair2', 'models/UnsavedScene_1.obj'),
            this.renderer.loadMesh('skull', 'models/12140_Skull_v3_L2.obj'),
            this.renderer.loadMesh('switch', 'models/Switch.fbx'),
            this.renderer.loadMesh('lamp', 'models/lamp.obj')
        ]);
    }
    
    async loadTextures() {
        // Carica tutte le texture necessarie
        await Promise.all([
            this.renderer.loadTexture('wall', 'textures/wall.jpg'),
            this.renderer.loadTexture('floor', 'textures/wood.jpg'),
            this.renderer.loadTexture('door', 'textures/door.png'),
            this.renderer.loadTexture('clock', 'models/orologio-horror_baseColor.jpg'),
            this.renderer.loadTexture('doll', 'models/Doll_Doll_BaseColor.png'),
            this.renderer.loadTexture('switch', 'textures/DefaultMaterial_Base_color.png')
        ]);
    }
    
    setupScene() {
        // Configura la stanza base
        this.scene.objects.set('floor', {
            mesh: 'plane',
            texture: 'floor',
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [this.ROOM_WIDTH, 1, this.ROOM_DEPTH]
        });
        
        // Aggiungi pareti
        this.setupWalls();
        
        // Aggiungi illuminazione
        this.setupLighting();
    }
    
    setupWalls() {
        // Funzione helper per creare una parete
        const createWall = (id, position, rotation, scale, hasWindow = false) => {
            this.scene.objects.set(id, {
                mesh: 'plane',
                texture: 'wall',
                position,
                rotation,
                scale,
                hasWindow
            });
        };
        
        // Crea le pareti della stanza
        createWall('wallFront', [0, this.ROOM_HEIGHT/2, -this.ROOM_DEPTH/2], 
            [0, 0, 0], [this.ROOM_WIDTH, this.ROOM_HEIGHT, 1], true);
            createWall('wallBack', [0, this.ROOM_HEIGHT/2, this.ROOM_DEPTH/2], 
                [0, Math.PI, 0], [this.ROOM_WIDTH, this.ROOM_HEIGHT, 1], true);
                createWall('wallLeft', [-this.ROOM_WIDTH/2, this.ROOM_HEIGHT/2, 0], 
                    [0, Math.PI/2, 0], [this.ROOM_DEPTH, this.ROOM_HEIGHT, 1]);
                    createWall('wallRight', [this.ROOM_WIDTH/2, this.ROOM_HEIGHT/2, 0], 
                        [0, -Math.PI/2, 0], [this.ROOM_DEPTH, this.ROOM_HEIGHT, 1], true);
                    }
                    
                    setupLighting() {
                        // Luce principale (lampadario)
                        this.scene.lights.set('mainLight', {
                            type: 'point',
                            position: [0, 9, 0],
                            color: [1, 0.95, 0.8],
                            intensity: 100,
                            enabled: true
                        });
                        
                        // Luce ambientale
                        this.scene.lights.set('ambient', {
                            type: 'ambient',
                            color: [0.2, 0.2, 0.2],
                            intensity: 0.3
                        });
                    }
                    
                    addInteractiveObjects() {
                        // Aggiungi oggetti interattivi alla scena
                        this.addDoll();
                        this.addWheelchairs();
                        this.addSkulls();
                        this.addClock();
                        this.addLightSwitch();
                    }
                    
                    addDoll() {
                        const randomPosition = [
                            (Math.random() - 0.5) * this.ROOM_WIDTH,
                            0,
                            (Math.random() - 0.5) * this.ROOM_DEPTH
                        ];
                        
                        this.scene.objects.set('doll', {
                            mesh: 'doll',
                            texture: 'doll',
                            position: randomPosition,
                            rotation: [0, Math.random() * Math.PI * 2, 0],
                            scale: [1, 1, 1],
                            interactive: true,
                            proximityRadius: 5
                        });
                    }
                    
                    addWheelchairs() {
                        // Prima sedia a rotelle
                        this.scene.objects.set('wheelchair1', {
                            mesh: 'wheelchair1',
                            texture: 'wheelchair',
                            position: [-this.ROOM_WIDTH + 10.5, -2.7, -this.ROOM_DEPTH/2 + 8],
                            rotation: [0, -Math.PI/2, 0],
                            scale: [0.2, 0.2, 0.2]
                        });
                        
                        // Seconda sedia a rotelle
                        this.scene.objects.set('wheelchair2', {
                            mesh: 'wheelchair2',
                            texture: 'wheelchair',
                            position: [-this.ROOM_WIDTH/2 + 20, -2.1, -this.ROOM_DEPTH/2 + 8],
                            rotation: [0, Math.PI/2, 0],
                            scale: [0.2, 0.2, 0.2]
                        });
                    }
                    
                    addSkulls() {
                        // Aggiunge i teschi nelle varie posizioni
                        const skullPositions = [
                            { pos: [-8, 0, -11.0], rot: [-Math.PI/2, 0, 0] },
                            { pos: [-8, 1.5, -10.8], rot: [-Math.PI/2 + 0.4, 0.2, 0.5] },
                            // ... altre posizioni dei teschi
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
                    
                    addClock() {
                        this.scene.objects.set('clock', {
                            mesh: 'clock',
                            texture: 'clock',
                            position: [-5, -0.75, -11.2],
                            rotation: [-Math.PI, -Math.PI/2, Math.PI],
                            scale: [1, 1, 1]
                        });
                    }
                    
                    addLightSwitch() {
                        this.scene.objects.set('switch', {
                            mesh: 'switch',
                            texture: 'switch',
                            position: [-this.ROOM_WIDTH/2 + 0.1, this.ROOM_HEIGHT/2, this.ROOM_DEPTH/4],
                            rotation: [0, Math.PI/2, 0],
                            scale: [0.05, 0.05, 0.05],
                            interactive: true,
                            proximityRadius: 2
                        });
                    }
                    
                    start() {
                        this.isRunning = true;
                        this.audio.playStartMusic();
                        this.gameLoop();
                    }
                    
                    gameLoop() {
                        if (!this.isRunning || this.isPaused) return;
                        
                        // Aggiorna input
                        this.input.update();
                        
                        // Aggiorna fisica
                        this.updatePhysics();
                        
                        // Aggiorna logica di gioco
                        this.update();
                        
                        // Renderizza
                        this.render();
                        
                        // Programma il prossimo frame
                        requestAnimationFrame(() => this.gameLoop());
                    }
                    
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
                    
                    update() {
                        // Aggiorna le interazioni con gli oggetti
                        this.checkObjectInteractions();
                        
                        // Aggiorna l'audio in base alla prossimità
                        this.updateProximityAudio();
                        
                        // Aggiorna la camera
                        this.updateCamera();
                        
                        if (this.renderer.settings.debug.playerPosition) {
                            console.log('Player position:', this.player.position);
                        }
                    }
                    
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
                                }
                            }
                        }
                    }
                    
                    getDistanceToPlayer(objectPosition) {
                        return Math.sqrt(
                            Math.pow(this.player.position[0] - objectPosition[0], 2) +
                            Math.pow(this.player.position[1] - objectPosition[1], 2) +
                            Math.pow(this.player.position[2] - objectPosition[2], 2)
                        );
                    }
                    
                    handleDollProximity() {
                        // Attiva suoni inquietanti se la luce è spenta
                        if (!this.isLightOn) {
                            this.audio.playProximitySound(true, true);
                        }
                    }
                    
                    handleSwitchProximity() {
                        // Mostra istruzioni per l'interruttore
                        document.getElementById('instructions').style.visibility = 'visible';
                        document.getElementById('crosshair').style.backgroundImage = "url('images/crosshair-selection.png')";
                    }
                    
                    updateProximityAudio() {
                        // Aggiorna l'audio in base alla posizione del giocatore
                        const dollObject = this.scene.objects.get('doll');
                        if (dollObject) {
                            const distance = this.getDistanceToPlayer(dollObject.position);
                            this.audio.playProximitySound(distance < dollObject.proximityRadius, !this.isLightOn);
                        }
                    }
                    
                    updateCamera() {
                        // Aggiorna la posizione della camera in base al giocatore
                        this.renderer.updateCamera(
                            this.player.position,
                            [
                                this.player.position[0] + Math.sin(this.player.rotation[1]),
                                this.player.position[1],
                                this.player.position[2] - Math.cos(this.player.rotation[1])
                            ],
                            [0, 1, 0]
                        );
                    }
                    
                    render() {
                        // Renderizza la scena
                        this.renderer.render(this.scene);
                    }
                    
                    togglePanel() {
                        const panel = document.getElementById('side-panel');
                        const isVisible = panel.classList.contains('visible');
                        
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
                    
                    toggleLight() {
                        if (this.canToggleLight && !this.isLightFlickering) {
                            this.isLightOn = !this.isLightOn;
                            this.isLightFlickering = true;
                            
                            // Effetto sfarfallio
                            this.renderer.setLightEnabled(this.isLightOn);
                            
                            setTimeout(() => {
                                this.isLightFlickering = false;
                            }, 500);
                        }
                    }
                    
                    updateCameraRotation(deltaX, deltaY) {
                        this.player.rotation[1] -= deltaX;
                        this.player.rotation[0] = Math.max(
                            -Math.PI/2,
                            Math.min(Math.PI/2, this.player.rotation[0] - deltaY)
                        );
                    }
                    
                    movePlayer(direction, speed) {
                        this.physics.movePlayer(direction, this.player, speed);
                    }
                    
                    playerJump() {
                        this.physics.jump();
                    }
                    
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
                        
                        // Gestione degli eventi touch per dispositivi mobili
                        this.setupTouchEvents();
                    }
                    
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
                    
                    pause() {
                        if (this.isRunning) {
                            this.isPaused = true;
                            this.isRunning = false;
                            
                            // Ferma l'audio se necessario
                            if (this.audio) {
                                this.audio.stopAll();
                            }
                            
                            // Eventualmente mostra menu di pausa o altre UI
                            document.getElementById('instructions').style.visibility = 'visible';
                            document.exitPointerLock();
                            document.body.style.cursor = 'default';
                        }
                    }
                    
                    resume() {
                        if (this.isPaused) {
                            this.isPaused = false;
                            this.isRunning = true;
                            
                            // Riavvia il game loop
                            this.gameLoop();
                            
                            // Ripristina l'audio se necessario
                            if (this.audio && this.isLightOn) {
                                this.audio.playStartMusic();
                            }
                            
                            // Ripristina UI e controlli
                            document.getElementById('instructions').style.visibility = 'hidden';
                            this.canvas.requestPointerLock();
                            document.body.style.cursor = 'none';
                        }
                    }
                }
                
                // Esporta la classe Game
                window.Game = Game;