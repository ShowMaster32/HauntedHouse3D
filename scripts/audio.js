/**
 * Classe per la gestione dell'audio nel gioco
 */
class AudioManager {
    constructor() {
        // Mappa dei suoni caricati
        this.sounds = {};
        
        // Stati dei suoni
        this.isPlaying = {};
        
        // Volume globale
        this.globalVolume = 1.0;
        
        // Audio context per effetti avanzati
        this.context = null;
        this.gainNodes = {};
        
        // Flag per mute
        this.isMuted = false;
        
        // Inizializza AudioContext dopo interazione utente
        document.addEventListener('click', () => {
            if (!this.context) {
                try {
                    window.AudioContext = window.AudioContext || window.webkitAudioContext;
                    this.context = new AudioContext();
                    this.initializeAudioContext();
                } catch (e) {
                    console.warn('Web Audio API non supportata dal browser:', e);
                }
            }
        }, { once: true });

        // Carica i suoni dagli elementi audio HTML
        this.loadDefaultSounds();
    }
    
    initializeAudioContext() {
        if (!this.context) return;
        
        // Ricrea i nodi gain per tutti i suoni esistenti
        Object.keys(this.sounds).forEach(name => {
            const sound = this.sounds[name];
            const source = this.context.createMediaElementSource(sound);
            const gainNode = this.context.createGain();
            source.connect(gainNode);
            gainNode.connect(this.context.destination);
            this.gainNodes[name] = gainNode;
        });
    }

    loadDefaultSounds() {
        // Carica i suoni dagli elementi HTML esistenti
        const audioElements = {
            'introMusic': document.getElementById('intro-music'),
            'startMusic': document.getElementById('start-music'),
            'randomGhost': document.getElementById('random-ghost'),
            'laLaLa': document.getElementById('la-la-la'),
            'demonLaugh': document.getElementById('demon-laugh')
        };

        Object.entries(audioElements).forEach(([name, element]) => {
            if (element) {
                this.sounds[name] = element;
                this.isPlaying[name] = false;
                element.volume = this.globalVolume;
            } else {
                console.warn(`Elemento audio "${name}" non trovato nel DOM`);
            }
        });
    }
    
    playSound(name, options = {}) {
        const sound = this.sounds[name];
        if (!sound) {
            console.warn(`Suono "${name}" non trovato`);
            return;
        }
        
        const { loop = false, volume = 1.0 } = options;
        
        // Resetta e imposta le opzioni
        sound.currentTime = 0;
        sound.loop = loop;
        sound.volume = Math.min(1, Math.max(0, volume * this.globalVolume));
        
        if (!this.isMuted) {
            const playPromise = sound.play();
            if (playPromise) {
                playPromise.then(() => {
                    this.isPlaying[name] = true;
                }).catch(error => {
                    console.warn(`Impossibile riprodurre "${name}":`, error);
                });
            }
        }
    }
    
    stopSound(name) {
        const sound = this.sounds[name];
        if (sound) {
            sound.pause();
            sound.currentTime = 0;
            this.isPlaying[name] = false;
        }
    }
    
    setVolume(name, volume) {
        const sound = this.sounds[name];
        if (sound) {
            sound.volume = Math.min(1, Math.max(0, volume * this.globalVolume));
        }
    }
    
    setGlobalVolume(volume) {
        this.globalVolume = Math.min(1, Math.max(0, volume));
        Object.values(this.sounds).forEach(sound => {
            if (sound.volume) {
                sound.volume = sound.volume * this.globalVolume;
            }
        });
    }
    
    setMute(muted) {
        this.isMuted = muted;
        Object.values(this.sounds).forEach(sound => {
            sound.muted = muted;
        });
    }
    
    playRandomGhostSound() {
        const sounds = ['randomGhost', 'laLaLa', 'demonLaugh'];
        const randomSound = sounds[Math.floor(Math.random() * sounds.length)];
        const randomDelay = Math.random() * 20000 + 10000; // 10-30 secondi
        
        this.playSound(randomSound, { volume: 0.7 });
        
        setTimeout(() => this.playRandomGhostSound(), randomDelay);
    }
    
    stopAllSounds() {
        Object.keys(this.sounds).forEach(name => {
            this.stopSound(name);
        });
    }
}

// Esporta una singola istanza
const audioManager = new AudioManager();
export { audioManager };