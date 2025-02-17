#version 300 es
precision highp float;

in vec2 vTextureCoord;
in vec3 vNormal;
in vec3 vFragPos;

uniform sampler2D uSampler;

// Uniforms per la luce principale
uniform vec3 uLightPosition;
uniform vec3 uLightColor;
uniform float uLightIntensity;
uniform vec3 uAttenuation;  // x: constant, y: linear, z: quadratic

// Uniforms per la luce ambientale
uniform vec3 uAmbientColor;
uniform float uAmbientIntensity;
uniform float uAmbientStrength;

// Altri parametri di illuminazione
uniform vec3 uViewPosition;
uniform float uSpecularStrength;
uniform float uShininess;

out vec4 fragColor;

void main() {
    // Ottieni il colore della texture
    vec4 texColor = texture(uSampler, vTextureCoord);
    
    // Calcola le direzioni necessarie
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(uLightPosition - vFragPos);
    vec3 viewDir = normalize(uViewPosition - vFragPos);
    vec3 halfwayDir = normalize(lightDir + viewDir);

    // Calcola l'attenuazione
    float distance = length(uLightPosition - vFragPos);
    float attenuation = 1.0 / (uAttenuation.x + 
                              uAttenuation.y * distance +
                              uAttenuation.z * distance * distance);

    // Luce ambientale migliorata
    vec3 ambient = uAmbientColor * uAmbientIntensity * uAmbientStrength * texColor.rgb;

    // Luce diffusa con intensità aumentata
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = uLightColor * diff * texColor.rgb * uLightIntensity;

    // Luce speculare con controllo migliore
    float spec = pow(max(dot(normal, halfwayDir), 0.0), uShininess);
    vec3 specular = uLightColor * spec * uSpecularStrength * uLightIntensity;

    // Combina tutte le componenti con attenzione all'attenuazione
    vec3 result = ambient + (diffuse + specular) * attenuation;
    
    // Boost generale per aumentare la luminosità
    result *= 1.2;

    // Gamma correction per un risultato più realistico
    result = pow(result, vec3(1.0/2.2));

    fragColor = vec4(result, texColor.a);
}