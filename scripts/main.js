import { initializeEnvironment, drawScene } from './environment.js';
import { loadModels } from './models.js';
import { controls, updatePlayer } from './player.js';
import { playRandomGhostSound } from './audio.js';
import { enableAdvancedRendering, disableAdvancedRendering } from './lighting.js';

let gl;
let lastFrameTime = 0;

function main() {
    // Initialize environment and WebGL context
    gl = initializeEnvironment();
    
    // Load models
    loadModels(gl);
    
    // Start background audio
    playRandomGhostSound();
    
    // Animation loop
    function gameLoop(currentTime) {
        const deltaTime = (currentTime - lastFrameTime) / 1000; // Convert to seconds
        lastFrameTime = currentTime;

        controls(deltaTime);
        updatePlayer(deltaTime);
        drawScene(gl);
        
        requestAnimationFrame(gameLoop);
    }

    requestAnimationFrame(gameLoop);
}

main();
