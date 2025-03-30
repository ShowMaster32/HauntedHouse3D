// Versione WebGL 1.0 (rimuovere la riga #version 300 es)
attribute vec4 aPosition;
attribute vec2 aTextureCoord;
attribute vec3 aNormal;

// Uniform matrices
uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat4 uNormalMatrix;
uniform mat4 uLightSpaceMatrix;

// Output to fragment shader
varying vec2 vTextureCoord;
varying vec3 vNormal;
varying vec3 vFragPos;
varying vec4 vFragPosLightSpace;

void main() {
    // Calcola la posizione del frammento nello spazio mondo
    vec4 worldPosition = uModelMatrix * aPosition;
    vFragPos = worldPosition.xyz;
    
    // Trasforma la normale usando la matrice normale
    vNormal = mat3(uNormalMatrix) * aNormal;
    
    // Passa le coordinate texture al fragment shader
    vTextureCoord = aTextureCoord;
    
    // Calcola la posizione nello spazio della luce per le ombre
    vFragPosLightSpace = uLightSpaceMatrix * worldPosition;
    
    // Calcola la posizione finale del vertice
    gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;
}