// Seleziona il canvas
const canvas = document.getElementById('webgl-canvas');
const gl = canvas.getContext('webgl');

// Imposta le dimensioni del canvas
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

if (!gl) {
    console.error('WebGL not supported');
} else {
    console.log('WebGL initialized successfully');
}

// Imposta il colore di sfondo
gl.clearColor(0.1, 0.1, 0.1, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);
