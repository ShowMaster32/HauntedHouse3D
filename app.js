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

// Funzione per ridimensionare il canvas
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
});

// Aggiungi il codice per caricare il modello OBJ e gestire la scena qui
// TODO

// Esempio di funzione per caricare un file OBJ
function loadOBJ(url, callback) {
    fetch(url)
        .then(response => response.text())
        .then(data => {
            // Parsing e callback
            callback(parseOBJ(data));
        })
        .catch(error => console.error('Error loading OBJ file:', error));
}

// Placeholder per il parsing del file OBJ
function parseOBJ(data) {
    // Implementazione del parsing del modello OBJ
    console.log(data);
}

// Carica il modello OBJ
loadOBJ('models/haunted_statue.obj', (model) => {
    console.log('Model loaded:', model);
    // Aggiungi il rendering del modello qui
});
