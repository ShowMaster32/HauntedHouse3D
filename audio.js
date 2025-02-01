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
            ghost: false,
            laLaLa: false,
            demonLaugh: false
        };

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Resetta i flag quando i suoni terminano
        Object.entries(this.sounds).forEach(([key, sound]) => {
            sound.addEventListener('ended', () => {
                if (this.isPlaying[key]) {
                    this.isPlaying[key] = false;
                }
            });
        });
    }

    playIntroMusic() {
        this.stopAll();
        this.sounds.intro.play();
    }

    playStartMusic() {
        this.stopAll();
        this.sounds.start.play();
        this.startRandomGhostSounds();
    }

    startRandomGhostSounds() {
        const playRandomSound = () => {
            const randomDelay = Math.random() * (30000 - 10000) + 10000; // 10-30 secondi
            setTimeout(() => {
                if (!this.isPlaying.ghost) {
                    this.sounds.ghost.play();
                    this.isPlaying.ghost = true;
                }
                playRandomSound(); // Schedule next sound
            }, randomDelay);
        };

        playRandomSound();
    }

    playProximitySound(isNearDoll, isLightOff) {
        if (isNearDoll && isLightOff) {
            // 50% chance for each sound
            const sound = Math.random() < 0.5 ? this.sounds.laLaLa : this.sounds.demonLaugh;
            const soundType = Math.random() < 0.5 ? 'laLaLa' : 'demonLaugh';

            if (!this.isPlaying[soundType]) {
                sound.play();
                this.isPlaying[soundType] = true;
            }
        }
    }

    stopAll() {
        Object.values(this.sounds).forEach(sound => {
            sound.pause();
            sound.currentTime = 0;
        });

        this.isPlaying = {
            ghost: false,
            laLaLa: false,
            demonLaugh: false
        };
    }

    setVolume(volume) {
        Object.values(this.sounds).forEach(sound => {
            sound.volume = volume;
        });
    }
}