// input.js
// Gestione degli input da tastiera, mouse e touch

class InputHandler {
    constructor(game) {
        this.game = game;
        this.keyStates = {};
        this.isPointerLocked = false;
        this.mousePosition = { x: 0, y: 0 };
        this.touchPosition = { x: 0, y: 0 };
        this.initialTouchX = 0;
        this.initialTouchY = 0;
        this.lastPinchDistance = null;
        this.swipeSensitivity = GAME_CONSTANTS.TOUCH.SWIPE_SENSITIVITY || 0.005;
        this.canRequestPointerLock = true;
        
        // Configura gli event listeners
        this.setupKeyboardControls();
        this.setupMouseControls();
        this.setupTouchControls();
        
        this.log('Input handler inizializzato con game reference: ' + (this.game ? 'valido' : 'INVALIDO'));
    }
    
    // Funzione di log
    log(message, isError = false) {
        console.log(isError ? `[INPUT ERROR] ${message}` : `[INPUT] ${message}`);
        
        if (typeof window.logDebug === 'function') {
            window.logDebug(message, isError ? 'error' : 'info');
        }
    }

    // Setup controlli da tastiera
    setupKeyboardControls() {
        document.addEventListener('keydown', (event) => {
            // Log aggiuntivo per debug
            console.log(`Tasto premuto: ${event.code}`);
            this.keyStates[event.code] = true;
            
            // Gestione pannello di controllo (tasto P)
            if (event.code === 'KeyP' && this.game) {
                this.game.togglePanel();
            }
            
            // Gestione luce (tasto F)
            if (event.code === 'KeyF' && this.game && !this.game.isLightFlickering) {
                this.game.toggleLight();
            }
            
            // Evita lo scroll della pagina con tasti di movimento
            if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
                event.preventDefault();
            }
        });

        document.addEventListener('keyup', (event) => {
            this.keyStates[event.code] = false;
            
            // Reset del flag per la luce
            if (event.code === 'KeyF' && this.game) {
                this.game.canToggleLight = true;
            }
        });
        
        this.log('Controlli da tastiera configurati');
    }

    // Setup controlli da mouse
    setupMouseControls() {
        const canvas = this.game ? this.game.canvas : document.getElementById('canvas');
        if (!canvas) {
            this.log('Canvas non trovato per configurare i controlli mouse', true);
            return;
        }
    
        canvas.addEventListener('click', () => {
            // Assicurati che il gioco sia in esecuzione e non in pausa
            if (!this.isPointerLocked && this.canRequestPointerLock) {
                try {
                    canvas.requestPointerLock();
                    this.canRequestPointerLock = false;
                    
                    // Reimposta il flag dopo un breve ritardo
                    setTimeout(() => {
                        this.canRequestPointerLock = true;
                    }, 1000);
                } catch (e) {
                    this.log('Errore nella richiesta di pointer lock: ' + e, true);
                }
            }
        });
    
        // Gestisci l'evento pointerlockchange
        document.addEventListener('pointerlockchange', () => {
            const isLocked = document.pointerLockElement === canvas;
            this.isPointerLocked = isLocked;
            
            if (isLocked) {
                document.body.style.cursor = 'none';
                if (this.game) this.game.isPaused = false;
                this.log('Puntatore bloccato');
            } else {
                document.body.style.cursor = 'default';
                // Non mettere in pausa automaticamente se il pannello è aperto
                const sidePanel = document.getElementById('side-panel');
                if (this.game && sidePanel && !sidePanel.classList.contains('visible')) {
                    this.game.isPaused = true;
                }
                this.log('Puntatore sbloccato');
            }
        });

        // Movimento mouse per rotazione camera
        document.addEventListener('mousemove', (event) => {
            if (document.pointerLockElement === canvas) {
                const sensitivity = GAME_CONSTANTS.CAMERA.SENSITIVITY || 0.002;
                const deltaX = event.movementX * sensitivity;
                const deltaY = event.movementY * sensitivity;

                // Aggiorna rotazione camera nel gioco
                if (this.game && this.game.updateCameraRotation) {
                    this.game.updateCameraRotation(deltaX, deltaY);
                } else {
                    this.log("Impossibile aggiornare la rotazione della camera", true);
                }
            }
        });
        
        this.log('Controlli da mouse configurati');
    }

    // Setup controlli touch per dispositivi mobili
    setupTouchControls() {
        const canvas = this.game ? this.game.canvas : document.getElementById('canvas');
        if (!canvas) {
            this.log('Canvas non trovato per configurare i controlli touch', true);
            return;
        }

        // Touch start
        canvas.addEventListener('touchstart', (event) => {
            // Memorizza posizione iniziale per calcolare swipe
            this.initialTouchX = event.touches[0].clientX;
            this.initialTouchY = event.touches[0].clientY;
            
            // Verifica se il tocco è vicino all'interruttore
            if (this.game && this.game.isNearSwitch && this.game.isNearSwitch()) {
                this.game.toggleLight();
            }
            
            // Gestione pinch con due dita
            if (event.touches.length === 2) {
                this.lastPinchDistance = Math.hypot(
                    event.touches[0].clientX - event.touches[1].clientX,
                    event.touches[0].clientY - event.touches[1].clientY
                );
            }
        });

        // Touch move
        canvas.addEventListener('touchmove', (event) => {
            event.preventDefault();
            
            // Rotazione camera con un dito
            if (event.touches.length === 1) {
                const touchX = event.touches[0].clientX;
                const touchY = event.touches[0].clientY;
                
                const deltaX = (touchX - this.initialTouchX) * this.swipeSensitivity;
                const deltaY = (touchY - this.initialTouchY) * this.swipeSensitivity;
                
                // Aggiorna rotazione camera
                if (this.game && this.game.updateCameraRotation) {
                    this.game.updateCameraRotation(deltaX, deltaY);
                }
                
                // Aggiorna posizione per il prossimo frame
                this.initialTouchX = touchX;
                this.initialTouchY = touchY;
            } 
            // Zoom con pinch a due dita
            else if (event.touches.length === 2) {
                const currentDistance = Math.hypot(
                    event.touches[0].clientX - event.touches[1].clientX,
                    event.touches[0].clientY - event.touches[1].clientY
                );
                
                if (this.lastPinchDistance) {
                    const pinchSensitivity = GAME_CONSTANTS.TOUCH.PINCH_SENSITIVITY || 0.01;
                    const delta = (this.lastPinchDistance - currentDistance) * pinchSensitivity;
                    
                    // Aggiorna FOV per zoom
                    if (this.game && this.game.renderer) {
                        this.game.renderer.updateCameraFOV(delta);
                    }
                }
                
                this.lastPinchDistance = currentDistance;
            }
        });

        // Touch end
        canvas.addEventListener('touchend', () => {
            this.lastPinchDistance = null;
        });
        
        this.log('Controlli touch configurati');
    }

    // Verifica se un tasto è premuto
    isKeyPressed(keyCode) {
        return !!this.keyStates[keyCode];
    }

    // Aggiorna lo stato dell'input
    update() {
        if (!this.game) {
            this.log("Game reference non valida nell'update", true);
            return;
        }
        
        // Log per diagnostica
        const activeKeys = Object.entries(this.keyStates)
            .filter(([_, isPressed]) => isPressed)
            .map(([key]) => key);
        
        if (activeKeys.length > 0) {
            this.log(`Tasti premuti: ${activeKeys.join(', ')}`);
        }
        
        // Test direzione di movimento più dettagliato
        const moveSpeed = 0.2;
        
        // DEBUG: Log della rotazione camera
        if (this.game.camera && this.game.camera.rotation) {
            this.log(`Camera rotation: y=${this.game.camera.rotation.y.toFixed(2)}`);
        } else {
            this.log("Camera rotation non disponibile", true);
        }
        
        // Test diretto del movimento - più sicuro dell'approccio precedente
        let moved = false;
        
        if (this.isKeyPressed('KeyW') || this.isKeyPressed('ArrowUp')) {
            this.log("Muovendo in avanti");
            this.movePlayerSafe('forward', moveSpeed);
            moved = true;
        }
        if (this.isKeyPressed('KeyS') || this.isKeyPressed('ArrowDown')) {
            this.log("Muovendo indietro");
            this.movePlayerSafe('backward', moveSpeed);
            moved = true;
        }
        if (this.isKeyPressed('KeyA') || this.isKeyPressed('ArrowLeft')) {
            this.log("Muovendo a sinistra");
            this.movePlayerSafe('left', moveSpeed);
            moved = true;
        }
        if (this.isKeyPressed('KeyD') || this.isKeyPressed('ArrowRight')) {
            this.log("Muovendo a destra");
            this.movePlayerSafe('right', moveSpeed);
            moved = true;
        }
        
        // Salto
        if ((this.isKeyPressed('Space') || this.isKeyPressed('KeyJ')) && 
            this.game.player && this.game.player.onFloor) {
            this.game.playerJump();
        }
        
        // Se c'è stato movimento, forza un aggiornamento della camera
        if (moved && this.game.updateCamera) {
            this.game.updateCamera();
        }
    }

    // Versione più sicura del movimento che verifica tutti i dati necessari
    movePlayerSafe(direction, speed) {
        if (!this.game) {
            this.log("Game reference non valida in movePlayerSafe", true);
            return;
        }
        
        if (!this.game.movePlayer) {
            this.log("movePlayer non disponibile nell'oggetto game", true);
            
            // Implementazione fallback diretta
            if (this.game.player && this.game.player.position && this.game.camera) {
                const yaw = this.game.camera.rotation ? this.game.camera.rotation.y : 0;
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
                
                // Aggiorna direttamente la posizione
                this.game.player.position[0] += moveX;
                this.game.player.position[2] += moveZ;
                
                this.log(`Movimento fallback: ${direction}, x=${moveX.toFixed(2)}, z=${moveZ.toFixed(2)}`);
            }
            return;
        }
        
        // Usa il metodo standard
        try {
            this.game.movePlayer(direction, speed);
        } catch (error) {
            this.log(`Errore in movePlayer: ${error}`, true);
        }
    }
}

// Rendi disponibile globalmente
window.InputHandler = InputHandler;