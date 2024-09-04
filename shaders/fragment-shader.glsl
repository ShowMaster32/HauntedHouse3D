// fragment-shader.glsl
precision mediump float;

uniform sampler2D u_texture;
uniform vec3 u_reverseLightDirection;
uniform vec3 u_lightColor;
uniform vec3 u_ambientLight;

varying vec3 v_normal;
varying vec2 v_texcoord;

void main() {
    vec3 normal = normalize(v_normal);
    float light = dot(normal, u_reverseLightDirection);
    vec4 color = texture2D(u_texture, v_texcoord);
    vec3 ambient = u_ambientLight * color.rgb;
    vec3 diffuse = u_lightColor * color.rgb * light;

    gl_FragColor = vec4(ambient + diffuse, color.a);
}
