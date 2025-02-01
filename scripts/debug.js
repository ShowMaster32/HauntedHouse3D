// debug.js

export const DEBUG = {
    enabled: true,
    physics: false,
    rendering: false,
    collision: false,
    player: false
};

export const DebugLogger = {
    physics: (message, ...args) => {
        if (DEBUG.enabled && DEBUG.physics) {
            console.log(`[Physics] ${message}`, ...args);
        }
    },
    
    rendering: (message, ...args) => {
        if (DEBUG.enabled && DEBUG.rendering) {
            console.log(`[Rendering] ${message}`, ...args);
        }
    },
    
    collision: (message, ...args) => {
        if (DEBUG.enabled && DEBUG.collision) {
            console.log(`[Collision] ${message}`, ...args);
        }
    },
    
    player: (message, ...args) => {
        if (DEBUG.enabled && DEBUG.player) {
            console.log(`[Player] ${message}`, ...args);
        }
    }
};

function createToggleButton(text, debugKey) {
    const button = document.createElement('button');
    button.className = `debug-toggle-btn ${DEBUG[debugKey] ? 'active' : 'inactive'}`;
    button.textContent = `${text} Debug: ${DEBUG[debugKey] ? 'ON' : 'OFF'}`;
    
    button.addEventListener('click', () => {
        DEBUG[debugKey] = !DEBUG[debugKey];
        button.className = `debug-toggle-btn ${DEBUG[debugKey] ? 'active' : 'inactive'}`;
        button.textContent = `${text} Debug: ${DEBUG[debugKey] ? 'ON' : 'OFF'}`;
        console.log(`${debugKey} debug: ${DEBUG[debugKey] ? 'ON' : 'OFF'}`);
    });
    
    return button;
}

function initializeControlPanel() {
    const panel = document.createElement('div');
    panel.id = 'control-panel';
    panel.className = 'hidden';
    
    panel.innerHTML = '<h2>Debug Controls</h2>';

    // Crea i bottoni per ogni tipo di debug
    const debugTypes = {
        physics: 'Physics',
        rendering: 'Rendering',
        collision: 'Collision',
        player: 'Player'
    };

    Object.entries(debugTypes).forEach(([key, text]) => {
        panel.appendChild(createToggleButton(text, key));
    });

    document.body.appendChild(panel);

    document.addEventListener('keydown', (e) => {
        if (e.code === 'KeyP') {
            panel.classList.toggle('hidden');
            panel.classList.toggle('visible');
        }
    });
}

export function initDebug() {
    initializeControlPanel();
    console.log('Debug system initialized');
    return DEBUG;
}