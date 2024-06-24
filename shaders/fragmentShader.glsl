precision mediump float;
varying vec3 vNormal;
varying vec3 vPosition;
uniform vec3 uLightPosition;
uniform vec3 uLightColor;
uniform vec3 uAmbientColor;

void main() {
    vec3 normal = normalize(vNormal);
    vec3 lightDirection = normalize(uLightPosition - vPosition);
    float diffuse = max(dot(lightDirection, normal), 0.0);
    vec3 diffuseColor = diffuse * uLightColor;
    vec3 ambientColor = uAmbientColor;
    gl_FragColor = vec4(diffuseColor + ambientColor, 1.0);
}
