#version 300 es
precision highp float;

in vec2 vTextureCoord;
in vec3 vNormal;
in vec3 vFragPos;
in vec4 vFragPosLightSpace;

uniform sampler2D uSampler;
uniform sampler2D uShadowMap;

// Luce principale
uniform vec3 uLightPosition;
uniform vec3 uLightColor;
uniform float uLightIntensity;
uniform vec3 uAttenuation;  // x: constant, y: linear, z: quadratic

// Luce ambientale
uniform vec3 uAmbientColor;
uniform float uAmbientIntensity;
uniform float uAmbientStrength;

// Camera e materiale
uniform vec3 uViewPosition;
uniform float uSpecularStrength;
uniform float uShininess;

out vec4 fragColor;

float calculateShadow(vec4 fragPosLightSpace) {
    // Esegue la proiezione prospettica
    vec3 projCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;
    
    // Trasforma nell'intervallo [0,1]
    projCoords = projCoords * 0.5 + 0.5;
    
    // Ottieni la profondità più vicina dal punto di vista della luce
    float closestDepth = texture(uShadowMap, projCoords.xy).r;
    
    // Profondità attuale del frammento
    float currentDepth = projCoords.z;
    
    // Calcola bias per evitare l'acne delle ombre
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(uLightPosition - vFragPos);
    float bias = max(0.05 * (1.0 - dot(normal, lightDir)), 0.005);
    
    // PCF (Percentage Closer Filtering) per ombre più morbide
    float shadow = 0.0;
    vec2 texelSize = 1.0 / vec2(textureSize(uShadowMap, 0));
    for(int x = -1; x <= 1; ++x) {
        for(int y = -1; y <= 1; ++y) {
            float pcfDepth = texture(uShadowMap, projCoords.xy + vec2(x, y) * texelSize).r;
            shadow += currentDepth - bias > pcfDepth ? 1.0 : 0.0;
        }
    }
    shadow /= 9.0;
    
    return shadow;
}

void main() {
    // Ottieni il colore dalla texture
    vec4 texColor = texture(uSampler, vTextureCoord);
    if(texColor.a < 0.1) discard;  // Gestione trasparenza

    // Vettori per calcoli di illuminazione
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(uLightPosition - vFragPos);
    vec3 viewDir = normalize(uViewPosition - vFragPos);
    vec3 halfwayDir = normalize(lightDir + viewDir);

    // Calcolo attenuazione
    float distance = length(uLightPosition - vFragPos);
    float attenuation = 1.0 / (
        uAttenuation.x + 
        uAttenuation.y * distance +
        uAttenuation.z * distance * distance
    );

    // Luce ambientale
    vec3 ambient = uAmbientColor * uAmbientIntensity * uAmbientStrength * texColor.rgb;

    // Luce diffusa
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = uLightColor * diff * texColor.rgb * uLightIntensity;

    // Luce speculare
    float spec = pow(max(dot(normal, halfwayDir), 0.0), uShininess);
    vec3 specular = uLightColor * spec * uSpecularStrength * uLightIntensity;

    // Calcola l'ombra
    float shadow = calculateShadow(vFragPosLightSpace);
    
    // Risultato finale con attenuazione e ombre
    vec3 result = ambient + (1.0 - shadow) * (diffuse + specular) * attenuation;

    // Boost generale per luminosità
    result *= 1.2;

    // Correzione gamma
    result = pow(result, vec3(1.0/2.2));

    fragColor = vec4(result, texColor.a);
}