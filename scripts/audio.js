export class AudioManager {
    constructor() {
        this.sounds = {};
    }

    /**
     * Carica un file audio e lo aggiunge alla libreria.
     * @param {string} name - Nome identificativo del suono.
     * @param {string} src - Percorso del file audio.
     */
    loadSound(name, src) {
        const audio = new Audio(src);
        audio.preload = "auto";

        // Gestione errori di caricamento
        audio.onerror = () => {
            console.error(`Errore nel caricamento del suono: ${name} (${src})`);
        };

        this.sounds[name] = audio;
    }

    /**
     * Riproduce un suono.
     * @param {string} name - Nome del suono da riprodurre.
     * @param {boolean} loop - Indica se il suono deve essere ripetuto (default: false).
     */
    playSound(name, loop = false) {
        const sound = this.sounds[name];
        if (sound) {
            sound.loop = loop; // Imposta il loop.
            sound.currentTime = 0;
            sound.play().catch((e) => console.error(`Errore nel riprodurre "${name}":`, e));
        } else {
            console.error(`Suono "${name}" non trovato.`);
        }
    }

    /**
     * Ferma un suono in riproduzione.
     * @param {string} name - Nome del suono da fermare.
     */
    stopSound(name) {
        const sound = this.sounds[name];
        if (sound) {
            sound.loop = false; // Disabilita il loop.
            sound.pause();
            sound.currentTime = 0;
        } else {
            console.error(`Suono "${name}" non trovato.`);
        }
    }

    /**
     * Ferma tutti i suoni attualmente in riproduzione.
     */
    stopAllSounds() {
        Object.values(this.sounds).forEach((sound) => {
            sound.loop = false; // Disabilita il loop per ogni suono.
            sound.pause();
            sound.currentTime = 0;
        });
    }

    /**
     * Cambia il volume di un suono.
     * @param {string} name - Nome del suono.
     * @param {number} volume - Valore del volume (0.0 - 1.0).
     */
    setVolume(name, volume) {
        if (this.sounds[name]) {
            this.sounds[name].volume = Math.min(Math.max(volume, 0), 1); // Limita il volume tra 0 e 1.
        } else {
            console.error(`Suono "${name}" non trovato.`);
        }
    }
}

// Esempio di utilizzo
const audioManager = new AudioManager();

// Caricamento dei suoni
audioManager.loadSound("introMusic", "./sounds/intro.mp3");
audioManager.loadSound("startMusic", "./sounds/start-game.mp3");
audioManager.loadSound("randomGhost", "./sounds/random-ghost.mp3");
audioManager.loadSound("laLaLa", "./sounds/la-la-la.mp3");
audioManager.loadSound("demonLaugh", "./sounds/demon-laugh.mp3");

// Inizializza gli eventi e i suoni
function initializeAudio() {
    const startButton = document.getElementById('start-button');
    if (!startButton) {
        console.error('Elemento "start-button" non trovato.');
        return;
    }

    startButton.addEventListener('click', () => {
        audioManager.stopSound("introMusic"); // Ferma l'intro music.
        audioManager.playSound("startMusic", false); // Riproduce la musica di start senza loop.
    });
}

// Funzione per attivare il suono casuale
export function playRandomGhostSound() {
    const delay = Math.random() * (30000 - 10000) + 10000; // Intervallo casuale tra 10s e 30s.
    setTimeout(() => {
        if (audioManager.sounds["randomGhost"]) {
            audioManager.playSound("randomGhost");
        } else {
            console.warn("Suono 'randomGhost' non caricato.");
        }
        playRandomGhostSound(); // Ripeti il ciclo.
    }, delay);
}

// Inizializzazione alla finestra di caricamento.
window.onload = initializeAudio;
