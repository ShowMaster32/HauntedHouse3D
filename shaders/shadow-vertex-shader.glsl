#version 300 es

// Input della posizione
in vec4 aPosition;

// Matrici necessarie per la shadow map
uniform mat4 uLightSpaceMatrix;
uniform mat4 uModelMatrix;

void main() {
    // Trasforma il vertice dal suo spazio locale allo spazio della luce
    gl_Position = uLightSpaceMatrix * uModelMatrix * aPosition;
}