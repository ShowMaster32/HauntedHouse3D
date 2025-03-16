// main.js
// Inizializzazione dell'applicazione e gestione errori

const GAME_VERSION = window.GAME_CONSTANTS.GAME_VERSION;
const DEBUG_MODE = window.GAME_CONSTANTS.DEBUG_MODE;
const ERROR_MESSAGES = window.GAME_CONSTANTS.ERROR_MESSAGES;

class GameApplication {
    constructor() {
        this.game = null;
        this.stats = null;
        this.isInitialized = false;
        this.debugMode = DEBUG_MODE;
        
        // Log di inizializzazione
        this.log(`Inizializzazione HauntedHouse v${GAME_VERSION}`);
    }
    
    // Funzione di log
    log(message, isError = false) {
        console.log(isError ? `[GAME ERROR] ${message}` : `[GAME] ${message}`);
        
        if (typeof logDebug === 'function') {
            logDebug(message, isError ? 'error' : 'info');
        }
    }

    // Inizializzazione dell'applicazione
    async initialize() {
        try {
            this.log(`Inizializzazione HauntedHouse v${GAME_VERSION}`);

            // Attendi il caricamento completo del DOM
            await this.waitForDOM();

            // Verifica requisiti di sistema
            this.checkSystemRequirements();

            // Inizializza le risorse di base
            await this.initializeResources();

            // Configura gestione errori
            this.setupErrorHandling();

            // Imposta tool di debug se necessario
            if (this.debugMode) {
                await this.setupDebugTools();
            }

            // Crea e inizializza il gioco
            this.game = new Game();
            await this.game.initialize();

            this.isInitialized = true;
            this.log('Inizializzazione gioco completata');

            // Aggiungi listener per resize e visibilità
            this.setupEventListeners();

            return true;

        } catch (error) {
            this.handleError(error);
            return false;
        }
    }

    // Attendi caricamento DOM
    async waitForDOM() {
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }
        this.log('DOM caricato');
    }

    // Verifica requisiti di sistema
    checkSystemRequirements() {
        // Verifica WebGL2
        const canvas = document.querySelector('#canvas');
        const gl = canvas.getContext('webgl2');
        if (!gl) {
            throw new Error(ERROR_MESSAGES.WEBGL_NOT_SUPPORTED);
        }
        this.log('WebGL 2 supportato');

        // Verifica Web Audio API
        if (!window.AudioContext && !window.webkitAudioContext) {
            this.log(ERROR_MESSAGES.AUDIO_NOT_SUPPORTED, true);
        } else {
            this.log('Web Audio API supportata');
        }

        // Verifica Pointer Lock API
        if (!('pointerLockElement' in document)) {
            this.log('Pointer Lock API non supportata. L\'esperienza di gioco potrebbe essere limitata.', true);
        } else {
            this.log('Pointer Lock API supportata');
        }
    }

    // Inizializza le risorse di base
    async initializeResources() {
        // Carica gli shader
        await this.loadShaders();

        // Precarica le texture di base
        await this.preloadTextures();
        
        this.log('Risorse di base inizializzate');
    }

    // Caricamento shader
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
                    return await response.text();
                })
            );

            // Memorizza gli shader per l'uso successivo
            window.gameShaders = {};
            shaderFiles.forEach((file, index) => {
                window.gameShaders[file] = shaders[index];
            });
            
            this.log('Shader caricati con successo');

        } catch (error) {
            throw new Error(`Errore nel caricamento degli shader: ${error.message}`);
        }
    }

    // Precaricamento texture base
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
            this.log('Texture di base precaricate');
        } catch (error) {
            throw new Error(`Errore nel precaricamento delle texture: ${error.message}`);
        }
    }

    // Configurazione gestione errori
    setupErrorHandling() {
        window.addEventListener('error', this.handleError.bind(this));
        window.addEventListener('unhandledrejection', this.handlePromiseError.bind(this));
        this.log('Gestione errori configurata');
    }

    // Configurazione strumenti di debug
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
        
        this.log('Strumenti di debug configurati');
    }

    // Configurazione listener eventi
    setupEventListeners() {
        // Gestione resize
        window.addEventListener('resize', this.handleResize.bind(this));

        // Gestione visibilità pagina
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

        // Gestione perdita contesto WebGL
        const canvas = document.querySelector('#canvas');
        canvas.addEventListener('webglcontextlost', this.handleContextLost.bind(this));
        canvas.addEventListener('webglcontextrestored', this.handleContextRestored.bind(this));
        
        this.log('Event listener configurati');
    }

    // Gestione ridimensionamento finestra
    handleResize() {
        if (this.game && this.isInitialized) {
            this.game.handleResize(window.innerWidth, window.innerHeight);
        }
    }

    // Gestione visibilità pagina
    handleVisibilityChange() {
        if (!this.game || !this.isInitialized) return;

        if (document.hidden) {
            this.game.pause();
        } else {
            this.game.resume();
        }
    }

    // Gestione perdita contesto WebGL
    handleContextLost(event) {
        event.preventDefault();
        this.log('WebGL context lost. Attempting to restore...', true);
        if (this.game) {
            this.game.pause();
        }
    }

    // Gestione ripristino contesto WebGL
    async handleContextRestored() {
        this.log('WebGL context restored. Reinitializing...', true);
        if (this.game) {
            await this.game.reinitialize();
            this.game.resume();
        }
    }

    // Gestione errori generali
    handleError(error) {
        this.log('Errore: ' + (error.message || error), true);
        this.showErrorMessage(ERROR_MESSAGES.GENERIC_ERROR);
    }

    // Gestione errori Promise
    handlePromiseError(event) {
        this.log('Promise non gestita: ' + (event.reason.message || event.reason), true);
        this.showErrorMessage(ERROR_MESSAGES.GENERIC_ERROR);
    }

    // Mostra messaggio di errore
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

// Esporta per uso globale
window.GameApplication = GameApplication;

// Inizializzazione automatica in fase di debug
if (DEBUG_MODE) {
    window.addEventListener('DOMContentLoaded', () => {
        // Non creare automaticamente l'applicazione, altrimenti si avranno due istanze
        // Lasciamo che venga creata quando l'utente preme il pulsante START
        console.log('Debug mode: Pronto per l\'inizializzazione manuale.');
        
        // Per debugging
        window.createApp = () => {
            const app = new GameApplication();
            window.gameApp = app;
            return app;
        };
    });
}