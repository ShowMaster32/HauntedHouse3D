// Versione WebGL 1.0 (rimuovere la riga #version 300 es)
precision highp float;

// Input dal vertex shader
varying vec2 vTextureCoord;
varying vec3 vNormal;
varying vec3 vFragPos;
varying vec4 vFragPosLightSpace;

// Texture samplers
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

// Flag per rendering avanzato
uniform bool uShadowsEnabled;
uniform bool uReflectionsEnabled;
uniform bool uAdvancedRendering;

// Calcola l'ombra usando PCF (Percentage Closer Filtering)
float calculateShadow(vec4 fragPosLightSpace) {
    // Esegue la proiezione prospettica
    vec3 projCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;
    
    // Trasforma nell'intervallo [0,1]
    projCoords = projCoords * 0.5 + 0.5;
    
    // Se fuori dalla shadow map, nessuna ombra
    if(projCoords.x < 0.0 || projCoords.x > 1.0 ||
       projCoords.y < 0.0 || projCoords.y > 1.0 ||
       projCoords.z < 0.0 || projCoords.z > 1.0) {
        return 0.0;
    }
    
    // Ottieni la profondità più vicina dal punto di vista della luce
    float closestDepth = texture2D(uShadowMap, projCoords.xy).r;
    
    // Profondità attuale del frammento
    float currentDepth = projCoords.z;
    
    // Calcola bias per evitare l'acne delle ombre
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(uLightPosition - vFragPos);
    float bias = max(0.05 * (1.0 - dot(normal, lightDir)), 0.005);
    
    // PCF per ombre più morbide
    float shadow = 0.0;
    vec2 texelSize = vec2(0.001, 0.001); // Valore fisso che funzionerà per la maggior parte delle texture
    for(int x = -1; x <= 1; ++x) {
        for(int y = -1; y <= 1; ++y) {
            float pcfDepth = texture2D(uShadowMap, projCoords.xy + vec2(float(x), float(y)) * texelSize).r;
            shadow += currentDepth - bias > pcfDepth ? 1.0 : 0.0;
        }
    }
    shadow /= 9.0;
    
    // Limita l'effetto dell'ombra per evitare aree troppo scure
    return min(shadow, 0.75);
}

void main() {
    // Ottieni il colore dalla texture
    vec4 texColor = texture2D(uSampler, vTextureCoord);
    
    // Gestione trasparenza semplice
    if(texColor.a < 0.1) discard;

    // Normalizza i vettori per calcoli di illuminazione
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
    
    // Se i riflessi sono abilitati, aumentiamo l'effetto speculare
    if (uReflectionsEnabled) {
        specular *= 1.5;
    }

    // Calcola l'ombra se abilitata
    float shadow = uShadowsEnabled ? calculateShadow(vFragPosLightSpace) : 0.0;
    
    // Risultato finale con attenuazione e ombre
    vec3 result = ambient + (1.0 - shadow) * (diffuse + specular) * attenuation;

    // Se il rendering avanzato è abilitato, aggiungiamo effetti extra
    if (uAdvancedRendering) {
        // Aumenta il contrasto
        result = pow(result, vec3(1.1));
        
        // Leggero vignettaggio
        vec2 centeredUV = vTextureCoord * 2.0 - 1.0;
        float vignette = 1.0 - dot(centeredUV, centeredUV) * 0.1;
        result *= vignette;
    }

    // Boost generale per luminosità
    result *= 1.2;

    // Correzione gamma
    result = pow(result, vec3(1.0/2.2));

    gl_FragColor = vec4(result, texColor.a);
}