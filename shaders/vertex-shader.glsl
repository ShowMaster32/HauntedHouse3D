#version 300 es

in vec4 aPosition;
in vec2 aTextureCoord;
in vec3 aNormal;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat4 uNormalMatrix;
uniform mat4 uLightSpaceMatrix;

out vec2 vTextureCoord;
out vec3 vNormal;
out vec3 vPosition;
out vec4 vPositionFromLight;
out vec3 vWorldPosition;

void main() {
    // Calcola la posizione del vertice nello spazio della vista
    vec4 viewPosition = uModelViewMatrix * aPosition;
    vPosition = viewPosition.xyz;
    
    // Passa le coordinate della texture al fragment shader
    vTextureCoord = aTextureCoord;
    
    // Trasforma la normale usando la matrice normale
    vNormal = normalize((uNormalMatrix * vec4(aNormal, 0.0)).xyz);
    
    // Calcola la posizione dal punto di vista della luce per le ombre
    vPositionFromLight = uLightSpaceMatrix * aPosition;
    
    // Calcola la posizione mondiale per calcoli di illuminazione
    vWorldPosition = (uModelViewMatrix * aPosition).xyz;
    
    // Proietta il vertice
    gl_Position = uProjectionMatrix * viewPosition;
}