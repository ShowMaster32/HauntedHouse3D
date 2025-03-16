// constants.js - Definisce tutte le costanti utilizzate nel gioco

// Inizializza prima l'oggetto nel window
window.GAME_CONSTANTS = {};

// Ora aggiungi tutte le costanti
window.GAME_CONSTANTS = {
    // Informazioni di versione
    GAME_VERSION: '1.0.0',
    DEBUG_MODE: true,
    
    // Dimensioni della stanza
    ROOM: {
        WIDTH: 20,
        HEIGHT: 10,
        DEPTH: 25,
        WALL_THICKNESS: 0.1
    },
    
    // Fisica
    PHYSICS: {
        GRAVITY: 30,
        JUMP_FORCE: 10,
        MOVEMENT_SPEED: 0.15,
        AIR_MOVEMENT_SPEED: 0.05
    },
    
    // Camera
    CAMERA: {
        FOV: 70,
        NEAR: 0.1,
        FAR: 1000,
        SENSITIVITY: 0.002
    },
    
    // Player
    PLAYER: {
        HEIGHT: 4,
        RADIUS: 0.35,
        BASE_SPEED: 25,
        SPRINT_MULTIPLIER: 1.5,
        CROUCH_MULTIPLIER: 0.5
    },
    
    // Audio
    AUDIO: {
        GHOST_SOUND_MIN_DELAY: 10000,
        GHOST_SOUND_MAX_DELAY: 30000,
        PROXIMITY_RADIUS: 5,
        FOOTSTEP_INTERVAL: 400
    },
    
    // Luci
    LIGHTS: {
        MAIN_LIGHT: {
            INTENSITY: 100,
            COLOR: [1, 0.95, 0.8],
            HEIGHT: 9,
            FLICKER_DURATION: 500
        },
        AMBIENT_LIGHT: {
            INTENSITY: 0.3,
            COLOR: [0.2, 0.2, 0.2]
        }
    },
    
    // Rendering
    RENDER: {
        SHADOW_MAP_SIZE: 1024,
        MAX_POINT_LIGHTS: 4,
        DEFAULT_GAMMA: 2.2
    },
    
    // Interazione
    INTERACTION: {
        SWITCH_PROXIMITY: 2,
        DOLL_PROXIMITY: 5,
        INTERACTION_DELAY: 500
    },
    
    // Controlli touch
    TOUCH: {
        SWIPE_SENSITIVITY: 0.005,
        PINCH_SENSITIVITY: 0.01,
        MIN_SWIPE_DISTANCE: 30
    },
    
    // Percorsi asset
    ASSETS: {
        MODELS: {
            CLOCK: 'models/pendent-clock.obj',
            DOLL: 'models/doll.obj',
            WHEELCHAIR1: 'models/kurumaisu.unity_1.obj',
            WHEELCHAIR2: 'models/UnsavedScene_1.obj',
            SKULL: 'models/12140_Skull_v3_L2.obj',
            SWITCH: 'models/Switch.fbx',
            LAMP: 'models/lamp.obj'
        },
        TEXTURES: {
            WALL: 'textures/wall.jpg',
            FLOOR: 'textures/wood.jpg',
            DOOR: 'textures/door.png',
            CLOCK: 'models/orologio-horror_baseColor.jpg',
            DOLL: 'models/Doll_Doll_BaseColor.png',
            SWITCH: 'textures/DefaultMaterial_Base_color.png'
        },
        SOUNDS: {
            INTRO: 'sounds/intro.mp3',
            START: 'sounds/start-game.mp3',
            GHOST: 'sounds/random-ghost.mp3',
            LALA: 'sounds/la-la-la.mp3',
            LAUGH: 'sounds/demon-laugh.mp3'
        }
    },
    
    // Messaggi di errore
    ERROR_MESSAGES: {
        WEBGL_NOT_SUPPORTED: 'WebGL 2 non è supportato da questo browser.',
        AUDIO_NOT_SUPPORTED: 'Web Audio API non supportata.',
        LOAD_ERROR: 'Errore durante il caricamento delle risorse.',
        GENERIC_ERROR: 'Si è verificato un errore. Ricarica la pagina per riprovare.'
    }
};