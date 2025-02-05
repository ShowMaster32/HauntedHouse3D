#version 300 es

in vec4 aPosition;

// Dichiarazione unica e corretta
uniform mat4 uLightSpaceMatrix;
uniform mat4 uModelMatrix;

void main() {
    gl_Position = uLightSpaceMatrix * uModelMatrix * aPosition;
}