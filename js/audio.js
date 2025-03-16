// audio.js
// Gestione dell'audio nel gioco

class AudioManager {
    constructor() {
        // Riferimenti agli elementi audio
        this.sounds = {
            intro: document.getElementById('intro-music'),
            start: document.getElementById('start-music'),
            ghost: document.getElementById('random-ghost'),
            laLaLa: document.getElementById('la-la-la'),
            demonLaugh: document.getElementById('demon-laugh')
        };

        // Flag per tracciare lo stato di riproduzione
        this.isPlaying = {
            intro: false,
            start: false,
            ghost: false,
            laLaLa: false,
            demonLaugh: false
        };

        // Impostazioni audio
        this.volume = 1.0;
        this.muted = false;
        this.randomSoundInterval = null;

        // Setup degli event listener
        this.setupEventListeners();
        
        // Log di inizializzazione
        this.log('Audio Manager inizializzato');
    }
    
    // Funzione di log
    log(message, isError = false) {
        console.log(isError ? `[AUDIO ERROR] ${message}` : `[AUDIO] ${message}`);
        
        if (typeof logDebug === 'function') {
            logDebug(message, isError ? 'error' : 'info');
        }
    }

    // Setup degli event listener per gli elementi audio
    setupEventListeners() {
        // Resetta i flag quando i suoni terminano
        Object.entries(this.sounds).forEach(([key, sound]) => {
            if (sound) {
                sound.addEventListener('ended', () => {
                    this.isPlaying[key] = false;
                    this.log(`Audio ${key} terminato`);
                });
                
                sound.addEventListener('error', (e) => {
                    this.log(`Errore nella riproduzione di ${key}: ${e}`, true);
                });
            }
        });
    }

    // Riproduce la musica di intro
    playIntroMusic() {
        this.stopAll();
        
        if (this.sounds.intro) {
            this.sounds.intro.currentTime = 0;
            this.sounds.intro.loop = true;
            
            this.sounds.intro.play()
                .then(() => {
                    this.isPlaying.intro = true;
                    this.log('Musica intro avviata');
                })
                .catch(error => {
                    this.log('Errore nella riproduzione della musica intro: ' + error, true);
                });
        }
    }

    // Ferma la musica di intro
    stopIntroMusic() {
        if (this.sounds.intro) {
            this.sounds.intro.pause();
            this.sounds.intro.currentTime = 0;
            this.isPlaying.intro = false;
        }
    }

    // Riproduce la musica di gioco
    async playStartMusic() {
        // Previeni chiamate multiple
        if (this._isPlayingStart) return;
        this._isPlayingStart = true;
        
        try {
            // Ferma tutto
            this.stopAll();
            
            // Riproduci la musica
            if (this.sounds.start) {
                this.sounds.start.loop = true;
                this.sounds.start.volume = 0.5; // Abbassa un po' il volume
                this.sounds.start.currentTime = 0;
                await this.sounds.start.play();
                this.isPlaying.start = true;
                this.log('Musica di gioco avviata');
                
                // Avvia i suoni casuali dopo un po'
                setTimeout(() => {
                    if (this.isPlaying.start) {
                        this.startRandomGhostSounds();
                    }
                }, 3000);
            }
        } catch (e) {
            this.log('Errore audio: ' + e, true);
        } finally {
            this._isPlayingStart = false;
        }
    }

    // Ferma la musica di gioco
    stopStartMusic() {
        if (this.sounds.start) {
            this.sounds.start.pause();
            this.sounds.start.currentTime = 0;
            this.isPlaying.start = false;
            
            // Ferma anche i suoni casuali
            this.stopRandomGhostSounds();
        }
    }

    // Avvia la riproduzione casuale di suoni di fantasmi
    startRandomGhostSounds() {
        // Cancella eventuali intervalli esistenti
        if (this.randomSoundInterval) {
            clearTimeout(this.randomSoundInterval);
        }
        
        const playRandomSound = () => {
            if (!this.isPlaying.ghost && !this.muted) {
                const minDelay = GAME_CONSTANTS.AUDIO.GHOST_SOUND_MIN_DELAY || 10000;
                const maxDelay = GAME_CONSTANTS.AUDIO.GHOST_SOUND_MAX_DELAY || 30000;
                const randomDelay = Math.random() * (maxDelay - minDelay) + minDelay;
                
                this.randomSoundInterval = setTimeout(() => {
                    if (this.sounds.ghost) {
                        this.sounds.ghost.currentTime = 0;
                        this.sounds.ghost.play()
                            .then(() => {
                                this.isPlaying.ghost = true;
                                this.log('Suono casuale di fantasma riprodotto');
                            })
                            .catch(error => {
                                this.log('Errore nella riproduzione del suono casuale: ' + error, true);
                            });
                    }
                    
                    // Programma il prossimo suono
                    playRandomSound();
                }, randomDelay);
            } else {
                // Se è già in riproduzione, riprova dopo un breve ritardo
                setTimeout(playRandomSound, 2000);
            }
        };

        // Avvia il ciclo
        playRandomSound();
    }
    
    // Ferma i suoni casuali
    stopRandomGhostSounds() {
        if (this.randomSoundInterval) {
            clearTimeout(this.randomSoundInterval);
            this.randomSoundInterval = null;
        }
    }

    // Riproduce suoni di prossimità quando il giocatore è vicino ad oggetti interessanti
    playProximitySound(isNearDoll, isLightOff) {
        if (isNearDoll && isLightOff && !this.muted) {
            // 50% di probabilità per ciascun suono
            const uselaLaLa = Math.random() < 0.5;
            const sound = uselaLaLa ? this.sounds.laLaLa : this.sounds.demonLaugh;
            const soundType = uselaLaLa ? 'laLaLa' : 'demonLaugh';

            if (sound && !this.isPlaying[soundType]) {
                sound.currentTime = 0;
                sound.play()
                    .then(() => {
                        this.isPlaying[soundType] = true;
                        this.log(`Suono di prossimità ${soundType} riprodotto`);
                    })
                    .catch(error => {
                        this.log(`Errore nella riproduzione del suono ${soundType}: ${error}`, true);
                    });
            }
        }
    }

    // Ferma i suoni di prossimità
    stopProximitySounds() {
        if (this.sounds.laLaLa) {
            this.sounds.laLaLa.pause();
            this.sounds.laLaLa.currentTime = 0;
            this.isPlaying.laLaLa = false;
        }
        
        if (this.sounds.demonLaugh) {
            this.sounds.demonLaugh.pause();
            this.sounds.demonLaugh.currentTime = 0;
            this.isPlaying.demonLaugh = false;
        }
    }

    // Ferma tutti i suoni
    stopAll() {
        Object.values(this.sounds).forEach(sound => {
            if (sound && !sound.paused) {
                sound.pause();
                sound.currentTime = 0;
            }
        });
        
        // Reset tutti i flag
        Object.keys(this.isPlaying).forEach(key => {
            this.isPlaying[key] = false;
        });
        
        this.log('Tutti i suoni fermati');
    }

    // Imposta il volume globale
    setVolume(volume) {
        // Assicurati che il volume sia tra 0 e 1
        this.volume = Math.max(0, Math.min(1, volume));
        
        // Applica il volume a tutti i suoni
        Object.values(this.sounds).forEach(sound => {
            if (sound) {
                sound.volume = this.volume;
            }
        });
        
        this.log(`Volume impostato a ${this.volume}`);
    }
    
    // Attiva/disattiva l'audio
    toggleMute() {
        this.muted = !this.muted;
        
        Object.values(this.sounds).forEach(sound => {
            if (sound) {
                sound.muted = this.muted;
            }
        });
        
        this.log(`Audio ${this.muted ? 'disattivato' : 'attivato'}`);
        
        return this.muted;
    }

    // Verifica se un suono specifico è in riproduzione
    isPlayingSound(soundName) {
        return this.isPlaying[soundName] || false;
    }
}

// Rendi disponibile globalmente
window.AudioManager = AudioManager;