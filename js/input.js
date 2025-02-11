// input.js
class InputHandler {
    constructor(game) {
        this.game = game;
        this.keyStates = {};
        this.isPointerLocked = false;
        this.mousePosition = { x: 0, y: 0 };
        this.touchPosition = { x: 0, y: 0 };
        this.initialTouchX = 0;
        this.initialTouchY = 0;
        this.swipeSensitivity = 0.005;

        this.setupKeyboardControls();
        this.setupMouseControls();
        this.setupTouchControls();
    }

    setupKeyboardControls() {
        document.addEventListener('keydown', (event) => {
            this.keyStates[event.code] = true;
            
            // Handle panel toggle
            if (event.code === 'KeyP') {
                this.game.togglePanel();
            }
            
            // Handle light toggle
            if (event.code === 'KeyF' && !this.game.isLightFlickering) {
                this.game.toggleLight();
            }
        });

        document.addEventListener('keyup', (event) => {
            this.keyStates[event.code] = false;
            if (event.code === 'KeyF') {
                this.game.canToggleLight = true;
            }
        });
    }

    setupMouseControls() {
        const canvas = document.getElementById('canvas');

        canvas.addEventListener('click', () => {
            if (!this.isPointerLocked) {
                canvas.requestPointerLock();
            }
        });

        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement === canvas;
            if (this.isPointerLocked) {
                document.body.style.cursor = 'none';
            } else {
                document.body.style.cursor = 'default';
            }
        });

        document.addEventListener('mousemove', (event) => {
            if (this.isPointerLocked) {
                const sensitivityX = 0.002;
                const sensitivityY = 0.004; // Raddoppiata la sensibilità verticale
                
                console.log('Mouse sensitivity:', {
                    deltaX: event.movementX * sensitivityX,
                    deltaY: event.movementY * sensitivityY
                });
        
                this.game.updateCameraRotation(
                    event.movementX * sensitivityX,
                    event.movementY * sensitivityY
                );
            }
        });
    }

    setupTouchControls() {
        const canvas = document.getElementById('canvas');

        canvas.addEventListener('touchstart', (event) => {
            this.initialTouchX = event.touches[0].clientX;
            this.initialTouchY = event.touches[0].clientY;
        });

        canvas.addEventListener('touchmove', (event) => {
            event.preventDefault();
            
            if (event.touches.length === 1) {
                const touchX = event.touches[0].clientX;
                const touchY = event.touches[0].clientY;
                
                const deltaX = (touchX - this.initialTouchX) * this.swipeSensitivity;
                const deltaY = (touchY - this.initialTouchY) * this.swipeSensitivity;
                
                this.game.updateCameraRotation(deltaX, deltaY);
                
                this.initialTouchX = touchX;
                this.initialTouchY = touchY;
            } else if (event.touches.length === 2) {
                // Implementa zoom con pinch
                const touch1 = event.touches[0];
                const touch2 = event.touches[1];
                const distance = Math.hypot(
                    touch1.clientX - touch2.clientX,
                    touch1.clientY - touch2.clientY
                );
                
                if (this.lastPinchDistance) {
                    const delta = this.lastPinchDistance - distance;
                    this.game.updateCameraZoom(delta * 0.01);
                }
                
                this.lastPinchDistance = distance;
            }
        });

        canvas.addEventListener('touchend', () => {
            this.lastPinchDistance = null;
        });
    }

    isKeyPressed(keyCode) {
        return !!this.keyStates[keyCode];
    }

    update() {
        // Update player movement based on current key states
        const moveSpeed = this.game.playerOnFloor ? 0.15 : 0.05;
        
        if (this.isKeyPressed('KeyW')) {
            this.game.movePlayer('forward', moveSpeed);
        }
        if (this.isKeyPressed('KeyS')) {
            this.game.movePlayer('backward', moveSpeed);
        }
        if (this.isKeyPressed('KeyA')) {
            this.game.movePlayer('left', moveSpeed);
        }
        if (this.isKeyPressed('KeyD')) {
            this.game.movePlayer('right', moveSpeed);
        }
        if (this.isKeyPressed('Space') && this.game.playerOnFloor) {
            this.game.playerJump();
        }
    }
}