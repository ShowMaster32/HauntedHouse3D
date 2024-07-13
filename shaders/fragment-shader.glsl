precision mediump float;
varying vec4 v_position;
uniform samplerCube u_skybox;
uniform mat4 u_viewDirectionProjectionInverse;

void main() {
  vec4 t = u_viewDirectionProjectionInverse * v_position;
  gl_FragColor = textureCube(u_skybox, normalize(t.xyz / t.w));
}
