#version 300 es
precision highp float;

in vec2 vTextureCoord;
in vec3 vNormal;
in vec3 vWorldPosition;
in vec4 vPositionFromLight;

uniform sampler2D uSampler;
uniform sampler2D uShadowMap;
uniform vec3 uLightPosition;
uniform vec3 uLightColor;
uniform float uLightIntensity;
uniform bool uShadowsEnabled;
uniform vec3 uViewPosition;
uniform float uAmbientStrength;
uniform float uSpecularStrength;
uniform float uShininess;

out vec4 fragColor;

float calculateShadow() {
    vec3 projCoords = vPositionFromLight.xyz / vPositionFromLight.w;
    projCoords = projCoords * 0.5 + 0.5;
    
    if(projCoords.z > 1.0 || projCoords.x < 0.0 || projCoords.x > 1.0 || projCoords.y < 0.0 || projCoords.y > 1.0)
        return 1.0;

    float closestDepth = texture(uShadowMap, projCoords.xy).r;
    float currentDepth = projCoords.z;
    
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(uLightPosition - vWorldPosition);
    float bias = max(0.005 * (1.0 - dot(normal, lightDir)), 0.001);
    
    return currentDepth - bias > closestDepth ? 0.5 : 1.0;
}

void main() {
    // Base color from texture
    vec4 texColor = texture(uSampler, vTextureCoord);
    if(texColor.a < 0.5) discard;

    // Vectors
    vec3 normal = normalize(vNormal);
    // Inverti la normale se necessario per il soffitto
    if(normal.y < 0.0) normal = -normal;
    vec3 lightDir = normalize(uLightPosition - vWorldPosition);
    vec3 viewDir = normalize(uViewPosition - vWorldPosition);
    vec3 reflectDir = reflect(-lightDir, normal);

    // Ambient
    vec3 ambient = uAmbientStrength * texColor.rgb;

    // Diffuse
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = diff * uLightColor * uLightIntensity * texColor.rgb;

    // Specular (Blinn-Phong)
    vec3 halfwayDir = normalize(lightDir + viewDir); 
    float spec = pow(max(dot(normal, halfwayDir), 0.0), uShininess);
    vec3 specular = uSpecularStrength * spec * uLightColor;

    // Attenuation
    float distance = length(uLightPosition - vWorldPosition);
    float attenuation = 1.0 / (1.0 + 0.09 * distance + 0.032 * (distance * distance));

    // Shadow
    float shadow = uShadowsEnabled ? calculateShadow() : 1.0;

    // Final color
    vec3 result = (ambient + (shadow * (diffuse + specular))) * attenuation;
    
    // Gamma correction
    result = pow(result, vec3(1.0/2.2));
    
    fragColor = vec4(result, texColor.a);
}