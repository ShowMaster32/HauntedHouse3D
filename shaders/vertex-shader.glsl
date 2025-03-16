#version 300 es

// Input attributes
in vec4 aPosition;
in vec2 aTextureCoord;
in vec3 aNormal;

// Uniform matrices
uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat4 uNormalMatrix;
uniform mat4 uLightSpaceMatrix;

// Output to fragment shader
out vec2 vTextureCoord;
out vec3 vNormal;
out vec3 vFragPos;
out vec4 vFragPosLightSpace;

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