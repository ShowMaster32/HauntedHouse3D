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
    vec3 projCoords = vPositionFromLight.xyz / vPositionFromLight.w;
    projCoords = projCoords * 0.5 + 0.5;
    
    float closestDepth = texture(uShadowMap, projCoords.xy).r;
    float currentDepth = projCoords.z;
    
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(uLightPosition - vWorldPosition);
    float bias = max(0.05 * (1.0 - dot(normal, lightDir)), 0.005);
    
    float shadow = 0.0;
    vec2 texelSize = 1.0 / vec2(textureSize(uShadowMap, 0));
    for(int x = -1; x <= 1; ++x) {
        for(int y = -1; y <= 1; ++y) {
            float pcfDepth = texture(uShadowMap, projCoords.xy + vec2(x, y) * texelSize).r;
            shadow += currentDepth - bias > pcfDepth ? 0.5 : 1.0;
        }
    }
    shadow /= 9.0;
    
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
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(uLightPosition - vWorldPosition);
    vec3 viewDir = normalize(uViewPosition - vWorldPosition);
    vec3 halfwayDir = normalize(lightDir + viewDir);
    
    vec4 texColor = texture(uSampler, vTextureCoord);
    float diff = max(dot(normal, lightDir), 0.0);
    float attenuation = calculateAttenuation(vWorldPosition);
    
    vec3 ambient = uAmbientStrength * uLightColor;
    vec3 diffuse = diff * uLightColor * uLightIntensity;
    
    vec3 specular = vec3(0.0);
    if(uReflectionsEnabled) {
        float spec = pow(max(dot(normal, halfwayDir), 0.0), uShininess);
        specular = uSpecularStrength * spec * uLightColor;
    }
    
    float shadow = uShadowsEnabled ? calculateShadow() : 1.0;
    
    vec3 result = (ambient + shadow * (diffuse + specular)) * texColor.rgb * attenuation;
    
    float gamma = 2.2;
    result = pow(result, vec3(1.0/gamma));
    
    fragColor = vec4(result, texColor.a);
}