#version 300 es
precision highp float;

in vec2 vTextureCoord;
in vec3 vNormal;
in vec3 vPosition;
in vec4 vPositionFromLight;
in vec3 vWorldPosition;

uniform sampler2D uSampler;
uniform sampler2D uShadowMap;
uniform vec3 uLightPosition;
uniform vec3 uLightColor;
uniform float uLightIntensity;
uniform bool uShadowsEnabled;
uniform bool uReflectionsEnabled;
uniform vec3 uViewPosition;
uniform float uAmbientStrength;
uniform float uSpecularStrength;
uniform float uShininess;

out vec4 fragColor;

float calculateShadow() {
    // Trasforma in coordinate NDC
    vec3 projCoords = vPositionFromLight.xyz / vPositionFromLight.w;
    projCoords = projCoords * 0.5 + 0.5;
    
    // Ottieni la profondità più vicina dal punto di vista della luce
    float closestDepth = texture(uShadowMap, projCoords.xy).r;
    float currentDepth = projCoords.z;
    
    // Bias per evitare il shadow acne
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(uLightPosition - vWorldPosition);
    float bias = max(0.05 * (1.0 - dot(normal, lightDir)), 0.005);
    
    // PCF (Percentage Closer Filtering)
    float shadow = 0.0;
    vec2 texelSize = 1.0 / vec2(textureSize(uShadowMap, 0));
    for(int x = -1; x <= 1; ++x) {
        for(int y = -1; y <= 1; ++y) {
            float pcfDepth = texture(uShadowMap, projCoords.xy + vec2(x, y) * texelSize).r;
            shadow += currentDepth - bias > pcfDepth ? 0.5 : 1.0;
        }
    }
    shadow /= 9.0;
    
    // Mantieni l'ombra a 1.0 se fuori dalla shadow map
    if(projCoords.z > 1.0)
        shadow = 1.0;
    
    return shadow;
}

float calculateAttenuation(vec3 fragPos) {
    float distance = length(uLightPosition - fragPos);
    float constant = 1.0;
    float linear = 0.09;
    float quadratic = 0.032;
    return 1.0 / (constant + linear * distance + quadratic * distance * distance);
}

void main() {
    // Calcola i vettori base
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(uLightPosition - vWorldPosition);
    vec3 viewDir = normalize(uViewPosition - vWorldPosition);
    vec3 halfwayDir = normalize(lightDir + viewDir);
    
    // Ottieni il colore della texture
    vec4 texColor = texture(uSampler, vTextureCoord);
    
    // Calcola l'attenuazione della luce
    float attenuation = calculateAttenuation(vWorldPosition);
    
    // Illuminazione ambientale
    vec3 ambient = uAmbientStrength * uLightColor;
    
    // Illuminazione diffusa
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = diff * uLightColor * uLightIntensity;
    
    // Illuminazione speculare
    vec3 specular = vec3(0.0);
    if(uReflectionsEnabled) {
        float spec = pow(max(dot(normal, halfwayDir), 0.0), uShininess);
        specular = uSpecularStrength * spec * uLightColor;
    }
    
    // Calcola le ombre
    float shadow = uShadowsEnabled ? calculateShadow() : 1.0;
    
    // Combina tutti i componenti
    vec3 result = (ambient + shadow * (diffuse + specular)) * texColor.rgb * attenuation;
    
    // Applica la correzione gamma
    float gamma = 2.2;
    result = pow(result, vec3(1.0/gamma));
    
    // Output finale
    fragColor = vec4(result, texColor.a);
}