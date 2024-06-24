attribute vec3 aPosition;
varying vec3 vPosition;

void main() {
    vPosition = aPosition;
    gl_Position = vec4(aPosition, 1.0);
}
