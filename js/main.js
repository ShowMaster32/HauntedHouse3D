// main.js

const GAME_VERSION = window.GAME_CONSTANTS.GAME_VERSION;
const DEBUG_MODE = window.GAME_CONSTANTS.DEBUG_MODE;
const ERROR_MESSAGES = window.GAME_CONSTANTS.ERROR_MESSAGES;

class GameApplication {
    constructor() {
        this.game = null;
        this.stats = null;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            console.info(`Initializing HauntedHouse v${GAME_VERSION}`);

            // Attendi il caricamento completo del DOM
            await this.waitForDOM();

            // Verifica requisiti di sistema
            this.checkSystemRequirements();

            // Inizializza le risorse di base
            await this.initializeResources();

            // Configura gestione errori
            this.setupErrorHandling();

            // Imposta tool di debug se necessario
            if (DEBUG_MODE) {
                await this.setupDebugTools();
            }

            // Crea e inizializza il gioco
            this.game = new Game();
            await this.game.initialize();

            this.isInitialized = true;
            console.info('Game initialization complete');

            // Aggiungi listener per resize e visibilità
            this.setupEventListeners();

            return true;

        } catch (error) {
            this.handleError(error);
            return false;
        }
    }

    async waitForDOM() {
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }
    }

    checkSystemRequirements() {
        // Verifica WebGL2
        const canvas = document.querySelector('#canvas');
        const gl = canvas.getContext('webgl2');
        if (!gl) {
            throw new Error(ERROR_MESSAGES.WEBGL_NOT_SUPPORTED);
        }

        // Verifica Web Audio API
        if (!window.AudioContext && !window.webkitAudioContext) {
            console.warn(ERROR_MESSAGES.AUDIO_NOT_SUPPORTED);
        }

        // Verifica Pointer Lock API
        if (!('pointerLockElement' in document)) {
            console.warn('Pointer Lock API non supportata. L\'esperienza di gioco potrebbe essere limitata.');
        }
    }

    async initializeResources() {
        // Carica gli shader
        await this.loadShaders();

        // Precarica le texture di base
        await this.preloadTextures();
    }

    async loadShaders() {
        const shaderFiles = [
            'vertex-shader.glsl',
            'fragment-shader.glsl',
            'shadow-vertex-shader.glsl',
            'shadow-fragment-shader.glsl'
        ];

        try {
            const shaders = await Promise.all(
                shaderFiles.map(async file => {
                    const response = await fetch(`shaders/${file}`);
                    if (!response.ok) throw new Error(`Failed to load shader: ${file}`);
                    return response.text();
                })
            );

            // Memorizza gli shader per l'uso successivo
            window.gameShaders = {};
            shaderFiles.forEach((file, index) => {
                window.gameShaders[file] = shaders[index];
            });

        } catch (error) {
            throw new Error(`Shader loading failed: ${error.message}`);
        }
    }

    async preloadTextures() {
        const baseTextures = [
            'textures/wall.jpg',
            'textures/wood.jpg',
            'textures/door.png'
        ];

        try {
            await Promise.all(
                baseTextures.map(texture => {
                    return new Promise((resolve, reject) => {
                        const img = new Image();
                        img.onload = () => resolve(img);
                        img.onerror = () => reject(new Error(`Failed to load texture: ${texture}`));
                        img.src = texture;
                    });
                })
            );
        } catch (error) {
            throw new Error(`Texture preloading failed: ${error.message}`);
        }
    }

    setupErrorHandling() {
        window.addEventListener('error', this.handleError.bind(this));
        window.addEventListener('unhandledrejection', this.handlePromiseError.bind(this));
    }

    async setupDebugTools() {
        // Stats.js per monitorare FPS
        this.stats = new Stats();
        this.stats.showPanel(0);
        document.body.appendChild(this.stats.dom);

        // Funzioni di debug globali
        window.debugGame = {
            getGameState: () => this.game ? this.game.getState() : null,
            toggleDebugView: () => this.game ? this.game.toggleDebugView() : null,
            getPerformanceMetrics: () => ({
                fps: this.stats ? this.stats.getFPS() : null,
                memory: performance.memory ? {
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize
                } : null
            })
        };

        // Avvia il loop delle statistiche
        const animate = () => {
            this.stats.begin();
            // Il game loop è gestito separatamente
            this.stats.end();
            requestAnimationFrame(animate);
        };
        animate();
    }

    setupEventListeners() {
        // Gestione resize
        window.addEventListener('resize', this.handleResize.bind(this));

        // Gestione visibilità pagina
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

        // Gestione perdita contesto WebGL
        const canvas = document.querySelector('#canvas');
        canvas.addEventListener('webglcontextlost', this.handleContextLost.bind(this));
        canvas.addEventListener('webglcontextrestored', this.handleContextRestored.bind(this));
    }

    handleResize() {
        if (this.game && this.isInitialized) {
            this.game.handleResize(window.innerWidth, window.innerHeight);
        }
    }

    handleVisibilityChange() {
        if (!this.game || !this.isInitialized) return;

        if (document.hidden) {
            this.game.pause();
        } else {
            this.game.resume();
        }
    }

    handleContextLost(event) {
        event.preventDefault();
        console.warn('WebGL context lost. Attempting to restore...');
        if (this.game) {
            this.game.pause();
        }
    }

    async handleContextRestored() {
        console.info('WebGL context restored. Reinitializing...');
        if (this.game) {
            await this.game.reinitialize();
            this.game.resume();
        }
    }

    handleError(error) {
        console.error('Game error:', error);
        this.showErrorMessage(ERROR_MESSAGES.GENERIC_ERROR);
    }

    handlePromiseError(event) {
        console.error('Unhandled promise rejection:', event.reason);
        this.showErrorMessage(ERROR_MESSAGES.GENERIC_ERROR);
    }

    showErrorMessage(message) {
        // Rimuovi eventuali messaggi di errore esistenti
        const existingError = document.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <div class="error-content">
                <h2>Errore</h2>
                <p>${message}</p>
                <button onclick="location.reload()">Ricarica gioco</button>
            </div>
        `;

        document.body.appendChild(errorDiv);
    }
}

// Rendi disponibile globalmente
window.GameApplication = GameApplication;

// Crea e avvia l'applicazione
const app = new GameApplication();
app.initialize().catch(error => {
    console.error('Failed to initialize game:', error);
});

// Esporta l'istanza per debug
if (DEBUG_MODE) {
    window.gameApp = app;
}