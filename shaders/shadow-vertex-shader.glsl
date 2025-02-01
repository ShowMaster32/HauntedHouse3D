#version 300 es

in vec4 aPosition;

uniform mat4 uLightSpaceMatrix;
uniform mat4 uModelMatrix;

void main() {
    gl_Position = uLightSpaceMatrix * uModelMatrix * aPosition;
}