#version 300 es

in vec4 aPosition;
in vec2 aTextureCoord;
in vec3 aNormal;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat4 uNormalMatrix;
uniform mat4 uLightSpaceMatrix;

out vec2 vTextureCoord;
out vec3 vNormal;
out vec3 vFragPos;
out vec4 vFragPosLightSpace;

void main() {
    // Calcola la posizione del frammento nello spazio mondo
    vFragPos = vec3(uModelMatrix * aPosition);
    
    // Trasforma la normale usando la matrice normale
    vNormal = normalize(mat3(uNormalMatrix) * aNormal);
    
    // Passa le coordinate texture al fragment shader
    vTextureCoord = aTextureCoord;
    
    // Calcola la posizione nello spazio della luce per le ombre
    vFragPosLightSpace = uLightSpaceMatrix * vec4(vFragPos, 1.0);
    
    // Calcola la posizione finale del vertice
    gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aPosition;
}