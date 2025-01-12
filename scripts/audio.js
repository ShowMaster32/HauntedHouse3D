export class AudioManager {
    constructor() {
        this.sounds = {};
        console.log("[AudioManager] Inizializzazione completata.");
    }

    /**
     * Carica un file audio e lo aggiunge alla libreria.
     * @param {string} name - Nome identificativo del suono.
     * @param {string} src - Percorso del file audio.
     */
    loadSound(name, src) {
        console.log(`[AudioManager] Inizio caricamento del suono: ${name}, URL: ${src}`);
        const audio = new Audio(src);
        audio.preload = "auto";

        audio.onerror = () => {
            console.error(`[AudioManager] Errore nel caricamento del suono: ${name} (${src})`);
        };

        audio.oncanplaythrough = () => {
            console.log(`[AudioManager] Suono caricato correttamente: ${name}`);
        };

        this.sounds[name] = audio;
    }

    /**
     * Riproduce un suono.
     * @param {string} name - Nome del suono da riprodurre.
     * @param {boolean} loop - Indica se il suono deve essere ripetuto (default: false).
     */
    playSound(name, loop = false) {
        console.log(`[AudioManager] Tentativo di riprodurre il suono: ${name}, Loop: ${loop}`);
        const sound = this.sounds[name];
        if (sound) {
            sound.loop = loop;
            sound.currentTime = 0;
            sound.play().then(() => {
                console.log(`[AudioManager] Suono "${name}" riprodotto correttamente.`);
            }).catch((e) => {
                console.error(`[AudioManager] Errore nel riprodurre "${name}":`, e);
            });
        } else {
            console.error(`[AudioManager] Suono "${name}" non trovato.`);
        }
    }

    /**
     * Ferma un suono in riproduzione.
     * @param {string} name - Nome del suono da fermare.
     */
    stopSound(name) {
        console.log(`[AudioManager] Tentativo di fermare il suono: ${name}`);
        const sound = this.sounds[name];
        if (sound) {
            sound.loop = false;
            sound.pause();
            sound.currentTime = 0;
            console.log(`[AudioManager] Suono "${name}" fermato correttamente.`);
        } else {
            console.error(`[AudioManager] Suono "${name}" non trovato.`);
        }
    }

    /**
     * Ferma tutti i suoni attualmente in riproduzione.
     */
    stopAllSounds() {
        console.log("[AudioManager] Tentativo di fermare tutti i suoni in riproduzione.");
        Object.keys(this.sounds).forEach((name) => {
            const sound = this.sounds[name];
            sound.loop = false;
            sound.pause();
            sound.currentTime = 0;
            console.log(`[AudioManager] Suono "${name}" fermato.`);
        });
        console.log("[AudioManager] Tutti i suoni fermati.");
    }

    /**
     * Cambia il volume di un suono.
     * @param {string} name - Nome del suono.
     * @param {number} volume - Valore del volume (0.0 - 1.0).
     */
    setVolume(name, volume) {
        console.log(`[AudioManager] Tentativo di cambiare il volume del suono: ${name}, Volume: ${volume}`);
        const sound = this.sounds[name];
        if (sound) {
            sound.volume = Math.min(Math.max(volume, 0), 1);
            console.log(`[AudioManager] Volume del suono "${name}" impostato a ${sound.volume}.`);
        } else {
            console.error(`[AudioManager] Suono "${name}" non trovato.`);
        }
    }
}

// Esempio di utilizzo
const audioManager = new AudioManager();

console.log("[AudioManager] Caricamento dei suoni di esempio.");
audioManager.loadSound("introMusic", "./sounds/intro.mp3");
audioManager.loadSound("startMusic", "./sounds/start-game.mp3");
audioManager.loadSound("randomGhost", "./sounds/random-ghost.mp3");
audioManager.loadSound("laLaLa", "./sounds/la-la-la.mp3");
audioManager.loadSound("demonLaugh", "./sounds/demon-laugh.mp3");

// Inizializza gli eventi e i suoni
function initializeAudio() {
    console.log("[AudioManager] Inizializzazione audio in corso.");
    const startButton = document.getElementById('start-button');
    if (!startButton) {
        console.error('Elemento "start-button" non trovato.');
        return;
    }

    startButton.addEventListener('click', () => {
        console.log("[AudioManager] Pulsante START cliccato. Cambio suono.");
        audioManager.stopSound("introMusic");
        audioManager.playSound("startMusic", false);
    });
}

// Funzione per attivare il suono casuale
export function playRandomGhostSound() {
    console.log("[AudioManager] Inizio riproduzione del suono casuale.");
    const delay = Math.random() * (30000 - 10000) + 10000;
    console.log(`[AudioManager] Prossimo suono casuale tra ${Math.round(delay / 1000)} secondi.`);
    setTimeout(() => {
        if (audioManager.sounds["randomGhost"]) {
            audioManager.playSound("randomGhost");
        } else {
            console.warn("[AudioManager] Suono 'randomGhost' non caricato.");
        }
        playRandomGhostSound();
    }, delay);
}

// Inizializzazione alla finestra di caricamento
window.onload = () => {
    console.log("[AudioManager] Finestra caricata. Inizializzo audio.");
    initializeAudio();
};
