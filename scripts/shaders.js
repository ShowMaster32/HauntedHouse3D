export const Shaders = {
    basicVertexShader: `
        attribute vec3 a_position;
        attribute vec3 a_normal;
        attribute vec2 a_texCoord;

        uniform mat4 u_modelMatrix;
        uniform mat4 u_viewMatrix;
        uniform mat4 u_projectionMatrix;

        varying vec3 v_normal;
        varying vec3 v_worldPosition;
        varying vec2 v_texCoord;

        void main() {
            vec4 worldPosition = u_modelMatrix * vec4(a_position, 1.0);
            v_worldPosition = worldPosition.xyz;
            v_normal = mat3(u_modelMatrix) * a_normal;
            v_texCoord = a_texCoord;
            gl_Position = u_projectionMatrix * u_viewMatrix * worldPosition;
        }
    `,

    basicFragmentShader: `
        precision highp float;

        varying vec3 v_normal;
        varying vec3 v_worldPosition;
        varying vec2 v_texCoord;

        uniform vec3 u_lightDirection;
        uniform vec3 u_lightColor;
        uniform vec3 u_ambientColor;
        uniform sampler2D u_texture;

        void main() {
            vec3 normal = normalize(v_normal);
            float lightIntensity = max(dot(normal, -u_lightDirection), 0.0);
            vec3 diffuseColor = u_lightColor * lightIntensity;
            vec3 ambientColor = u_ambientColor;
            vec4 textureColor = texture2D(u_texture, v_texCoord);
            vec3 finalColor = (diffuseColor + ambientColor) * textureColor.rgb;
            gl_FragColor = vec4(finalColor, textureColor.a);
        }
    `,

    phongVertexShader: `
        attribute vec3 a_position;
        attribute vec3 a_normal;
        attribute vec2 a_texCoord;

        uniform mat4 u_modelMatrix;
        uniform mat4 u_viewMatrix;
        uniform mat4 u_projectionMatrix;

        varying vec3 v_normal;
        varying vec3 v_worldPosition;
        varying vec2 v_texCoord;

        void main() {
            vec4 worldPosition = u_modelMatrix * vec4(a_position, 1.0);
            v_worldPosition = worldPosition.xyz;
            v_normal = mat3(u_modelMatrix) * a_normal;
            v_texCoord = a_texCoord;
            gl_Position = u_projectionMatrix * u_viewMatrix * worldPosition;
        }
    `,

    phongFragmentShader: `
        precision highp float;

        varying vec3 v_normal;
        varying vec3 v_worldPosition;
        varying vec2 v_texCoord;

        uniform vec3 u_lightPosition;
        uniform vec3 u_lightColor;
        uniform vec3 u_ambientColor;
        uniform vec3 u_cameraPosition;
        uniform sampler2D u_texture;
        uniform bool u_enableSpecular;

        void main() {
            vec3 normal = normalize(v_normal);
            vec3 lightDirection = normalize(u_lightPosition - v_worldPosition);
            float diffuseIntensity = max(dot(normal, lightDirection), 0.0);
            vec3 diffuseColor = u_lightColor * diffuseIntensity;

            vec3 specularColor = vec3(0.0);
            if (u_enableSpecular) {
                vec3 viewDirection = normalize(u_cameraPosition - v_worldPosition);
                vec3 reflectDirection = reflect(-lightDirection, normal);
                float specularIntensity = pow(max(dot(viewDirection, reflectDirection), 0.0), 32.0);
                specularColor = u_lightColor * specularIntensity;
            }

            vec3 ambientColor = u_ambientColor;
            vec4 textureColor = texture2D(u_texture, v_texCoord);
            vec3 finalColor = (ambientColor + diffuseColor + specularColor) * textureColor.rgb;
            gl_FragColor = vec4(finalColor, textureColor.a);
        }
    `
};
