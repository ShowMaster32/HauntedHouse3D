#version 300 es
precision highp float;

out vec4 fragColor;

void main() {
    // Per la shadow map, scriviamo solo la profondità
    fragColor = vec4(gl_FragCoord.z, 0.0, 0.0, 1.0);
}