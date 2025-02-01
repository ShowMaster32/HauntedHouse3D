#version 300 es
precision highp float;

out vec4 fragColor;

void main() {
    // Il fragment shader per la shadow map deve solo scrivere la profondità
    // Non è necessario scrivere un colore poiché stiamo utilizzando una depth texture
    fragColor = vec4(gl_FragCoord.z, 0.0, 0.0, 1.0);
}