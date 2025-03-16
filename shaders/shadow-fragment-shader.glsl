#version 300 es
precision highp float;

// Output - non usiamo colore per le shadow map, solo profondità
out vec4 fragColor;

void main() {
    // Per la shadow map, scriviamo solo la profondità
    // il depth buffer verrà automaticamente popolato da gl_FragCoord.z
    // ma scriviamo anche nel color buffer per compatibilità
    fragColor = vec4(gl_FragCoord.z, 0.0, 0.0, 1.0);
}