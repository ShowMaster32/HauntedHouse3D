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
        
        // Configura gli event listeners
        this.setupKeyboardControls();
        this.setupMouseControls();
        this.setupTouchControls();
        
        this.log('Input handler inizializzato');
    }
    
    // Funzione di log
    log(message, isError = false) {
        console.log(isError ? `[INPUT ERROR] ${message}` : `[INPUT] ${message}`);
        
        if (typeof logDebug === 'function') {
            logDebug(message, isError ? 'error' : 'info');
        }
    }

    // Setup controlli da tastiera
    setupKeyboardControls() {
        document.addEventListener('keydown', (event) => {
            this.keyStates[event.code] = true;
            
            // Gestione pannello di controllo (tasto P)
            if (event.code === 'KeyP') {
                this.game.togglePanel();
            }
            
            // Gestione luce (tasto F)
            if (event.code === 'KeyF' && !this.game.isLightFlickering) {
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
            if (event.code === 'KeyF') {
                this.game.canToggleLight = true;
            }
        });
        
        this.log('Controlli da tastiera configurati');
    }

    // Setup controlli da mouse
    setupMouseControls() {
        const canvas = document.getElementById('canvas');
    
        canvas.addEventListener('click', () => {
            // Assicurati che il gioco sia in esecuzione e non in pausa
            if (!this.isPointerLocked && this.game && !this.game.isPaused) {
                try {
                    // Avvolgi in un try-catch per gestire eventuali errori
                    canvas.requestPointerLock().catch(e => {
                        console.warn('Impossibile bloccare il puntatore:', e);
                        // Non effettuare ulteriori tentativi per un po'
                        setTimeout(() => {
                            this.canRequestPointerLock = true;
                        }, 1000);
                    });
                    this.canRequestPointerLock = false;
                } catch (e) {
                    console.warn('Eccezione nella richiesta di pointer lock:', e);
                }
            }
        });
    
        // Gestisci l'evento pointerlockchange in modo più robusto
        document.addEventListener('pointerlockchange', () => {
            const isLocked = document.pointerLockElement === canvas;
            this.isPointerLocked = isLocked;
            
            if (isLocked) {
                document.body.style.cursor = 'none';
                if (this.game) this.game.isPaused = false;
                this.log('Puntatore bloccato');
            } else {
                document.body.style.cursor = 'default';
                // Non mettere in pausa automaticamente il gioco
                // a meno che non sia stato esplicitamente richiesto
                this.log('Puntatore sbloccato');
            }
        });

        // Movimento mouse per rotazione camera
    document.addEventListener('mousemove', (event) => {
        if (document.pointerLockElement === canvas) {
            this.log(`Mouse move in InputHandler: x=${event.movementX}, y=${event.movementY}`);
            const sensitivity = GAME_CONSTANTS.CAMERA.SENSITIVITY || 0.002;
            const deltaX = event.movementX * sensitivity;
            const deltaY = event.movementY * sensitivity;

            // Aggiorna rotazione camera
            if (this.game && this.game.camera) {
                this.game.camera.rotation.y -= deltaX;
                this.game.camera.rotation.x -= deltaY;
                
                // Limita rotazione verticale per evitare capovolgimenti
                this.game.camera.rotation.x = Math.max(
                    -Math.PI / 2 + 0.1, 
                    Math.min(Math.PI / 2 - 0.1, this.game.camera.rotation.x)
                );
                
                // Forza un rendering
                if (this.game.render) {
                    this.game.render();
                }
            }
        }
    });
        
        this.log('Controlli da mouse configurati');
    }

    // Setup controlli touch per dispositivi mobili
    setupTouchControls() {
        const canvas = document.getElementById('canvas');

        // Touch start
        canvas.addEventListener('touchstart', (event) => {
            // Memorizza posizione iniziale per calcolare swipe
            this.initialTouchX = event.touches[0].clientX;
            this.initialTouchY = event.touches[0].clientY;
            
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
                if (this.game) {
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
        // Log per diagnostica
        const activeKeys = Object.entries(this.keyStates)
            .filter(([_, isPressed]) => isPressed)
            .map(([key]) => key);
        
        if (activeKeys.length > 0) {
            this.log(`Tasti premuti: ${activeKeys.join(', ')}`);
        }
        
        // Update player movement based on current key states
        const moveSpeed = this.game.playerOnFloor ? 0.15 : 0.05;
        
        if (this.isKeyPressed('KeyW') || this.isKeyPressed('ArrowUp')) {
            this.log('Movimento in avanti');
            this.game.movePlayer('forward', moveSpeed);
        }
        if (this.isKeyPressed('KeyS') || this.isKeyPressed('ArrowDown')) {
            this.log('Movimento indietro');
            this.game.movePlayer('backward', moveSpeed);
        }
        
        // Movimento laterale
        if (this.isKeyPressed('KeyA') || this.isKeyPressed('ArrowLeft')) {
            this.game.movePlayer('left', moveSpeed);
        }
        if (this.isKeyPressed('KeyD') || this.isKeyPressed('ArrowRight')) {
            this.game.movePlayer('right', moveSpeed);
        }
        
        // Salto
        if ((this.isKeyPressed('Space') || this.isKeyPressed('KeyJ')) && this.game.playerOnFloor) {
            this.game.playerJump();
        }
    }
}

// Rendi disponibile globalmente
window.InputHandler = InputHandler;