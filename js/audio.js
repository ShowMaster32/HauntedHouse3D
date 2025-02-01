// audio.js
class AudioManager {
    constructor() {
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

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Resetta i flag quando i suoni terminano
        Object.entries(this.sounds).forEach(([key, sound]) => {
            if (sound) {
                sound.addEventListener('ended', () => {
                    this.isPlaying[key] = false;
                });
            }
        });
    }

    playIntroMusic() {
        this.stopAll();
        if (this.sounds.intro) {
            this.sounds.intro.play();
            this.isPlaying.intro = true;
        }
    }

    stopIntroMusic() {
        if (this.sounds.intro) {
            this.sounds.intro.pause();
            this.sounds.intro.currentTime = 0;
            this.isPlaying.intro = false;
        }
    }

    async playStartMusic() {
        try {
            await this.stopAll();  // Aspetta che tutti i suoni siano fermati
            if (this.sounds.start) {
                await this.sounds.start.play();
                this.isPlaying.start = true;
                this.startRandomGhostSounds();
            }
        } catch (error) {
            console.warn('Audio playback failed:', error);
        }
    }

    stopStartMusic() {
        if (this.sounds.start) {
            this.sounds.start.pause();
            this.sounds.start.currentTime = 0;
            this.isPlaying.start = false;
        }
    }

    startRandomGhostSounds() {
        const playRandomSound = () => {
            if (!this.isPlaying.ghost) {
                const randomDelay = Math.random() * (30000 - 10000) + 10000; // 10-30 secondi
                setTimeout(() => {
                    if (this.sounds.ghost && !this.isPlaying.ghost) {
                        this.sounds.ghost.play();
                        this.isPlaying.ghost = true;
                        playRandomSound(); // Schedule next sound
                    }
                }, randomDelay);
            }
        };

        playRandomSound();
    }

    playProximitySound(isNearDoll, isLightOff) {
        if (isNearDoll && isLightOff) {
            // 50% chance for each sound
            const uselaLaLa = Math.random() < 0.5;
            const sound = uselaLaLa ? this.sounds.laLaLa : this.sounds.demonLaugh;
            const soundType = uselaLaLa ? 'laLaLa' : 'demonLaugh';

            if (sound && !this.isPlaying[soundType]) {
                sound.play();
                this.isPlaying[soundType] = true;
            }
        }
    }

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

    async stopAll() {
        const promises = Object.entries(this.sounds).map(([key, sound]) => {
            if (sound && !sound.paused) {
                sound.pause();
                sound.currentTime = 0;
                this.isPlaying[key] = false;
            }
        });
        await Promise.all(promises);
    }

    setVolume(volume) {
        // Assicurati che il volume sia tra 0 e 1
        const safeVolume = Math.max(0, Math.min(1, volume));
        Object.values(this.sounds).forEach(sound => {
            if (sound) {
                sound.volume = safeVolume;
            }
        });
    }

    // Metodo per verificare se un suono specifico è in riproduzione
    isPlayingSound(soundName) {
        return this.isPlaying[soundName] || false;
    }
}

// Rendi disponibile globalmente
window.AudioManager = AudioManager;