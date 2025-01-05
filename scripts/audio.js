export class AudioManager {
    constructor() {
        this.sounds = {};
    }

    /**
     * Carica un file audio e lo aggiunge alla libreria
     * @param {string} name - Nome identificativo del suono
     * @param {string} src - Percorso del file audio
     */
    loadSound(name, src) {
        const audio = new Audio(src);
        audio.preload = "auto";
        this.sounds[name] = audio;
    }

    /**
     * Riproduce un suono
     * @param {string} name - Nome del suono da riprodurre
     * @param {boolean} loop - Indica se il suono deve essere ripetuto (default: false)
     */
    playSound(name, loop = false) {
        if (this.sounds[name]) {
            this.sounds[name].loop = loop;
            this.sounds[name].currentTime = 0;
            this.sounds[name].play();
        } else {
            console.error(`Suono "${name}" non trovato.`);
        }
    }

    /**
     * Ferma un suono in riproduzione
     * @param {string} name - Nome del suono da fermare
     */
    stopSound(name) {
        if (this.sounds[name]) {
            this.sounds[name].pause();
            this.sounds[name].currentTime = 0;
        } else {
            console.error(`Suono "${name}" non trovato.`);
        }
    }

    /**
     * Ferma tutti i suoni attualmente in riproduzione
     */
    stopAllSounds() {
        for (const sound in this.sounds) {
            this.sounds[sound].pause();
            this.sounds[sound].currentTime = 0;
        }
    }

    /**
     * Cambia il volume di un suono
     * @param {string} name - Nome del suono
     * @param {number} volume - Valore del volume (0.0 - 1.0)
     */
    setVolume(name, volume) {
        if (this.sounds[name]) {
            this.sounds[name].volume = Math.min(Math.max(volume, 0), 1); // Limita il volume tra 0 e 1
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

// Riproduzione della musica di introduzione all'avvio
window.onload = () => {
    const startButton = document.getElementById('start-button');
    startButton.addEventListener('click', () => {
        const introMusic = document.getElementById('intro-music');
        introMusic.play().catch((error) => {
            console.error('Playback error:', error);
        });
    });
};

// Funzione per attivare il suono casuale
export function playRandomGhostSound() {
    const delay = Math.random() * (30000 - 10000) + 10000; // Intervallo casuale tra 10s e 30s
    setTimeout(() => {
        audioManager.playSound("randomGhost");
        playRandomGhostSound(); // Ripeti il ciclo
    }, delay);
}

// Evento per fermare la musica di introduzione e avviare la musica del gioco
document.getElementById("start-button").addEventListener("click", () => {
    audioManager.stopSound("introMusic");
    audioManager.playSound("startMusic", true);
});
