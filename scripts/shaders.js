export const Shaders = {
    // Vertex Shader per il rendering base
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
            // Calcolo della posizione del vertice in spazio mondo
            vec4 worldPosition = u_modelMatrix * vec4(a_position, 1.0);
            v_worldPosition = worldPosition.xyz;

            // Trasformazione della normale in spazio mondo
            v_normal = mat3(u_modelMatrix) * a_normal;

            // Passaggio delle coordinate texture
            v_texCoord = a_texCoord;

            // Calcolo della posizione finale del vertice
            gl_Position = u_projectionMatrix * u_viewMatrix * worldPosition;
        }
    `,

    // Fragment Shader per il rendering base
    basicFragmentShader: `
        precision mediump float;

        varying vec3 v_normal;
        varying vec3 v_worldPosition;
        varying vec2 v_texCoord;

        uniform vec3 u_lightDirection;
        uniform vec3 u_lightColor;
        uniform vec3 u_ambientColor;
        uniform sampler2D u_texture;

        void main() {
            // Normalizzazione della normale
            vec3 normal = normalize(v_normal);

            // Calcolo dell'illuminazione direzionale
            float lightIntensity = max(dot(normal, -u_lightDirection), 0.0);

            // Calcolo del colore diffuso e ambientale
            vec3 diffuseColor = u_lightColor * lightIntensity;
            vec3 ambientColor = u_ambientColor;

            // Applicazione della texture
            vec4 textureColor = texture2D(u_texture, v_texCoord);

            // Colore finale del pixel
            vec3 finalColor = (diffuseColor + ambientColor) * textureColor.rgb;

            gl_FragColor = vec4(finalColor, textureColor.a);
        }
    `,

    // Vertex Shader per oggetti illuminati dinamicamente
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
            // Calcolo della posizione del vertice in spazio mondo
            vec4 worldPosition = u_modelMatrix * vec4(a_position, 1.0);
            v_worldPosition = worldPosition.xyz;

            // Trasformazione della normale in spazio mondo
            v_normal = mat3(u_modelMatrix) * a_normal;

            // Passaggio delle coordinate texture
            v_texCoord = a_texCoord;

            // Calcolo della posizione finale del vertice
            gl_Position = u_projectionMatrix * u_viewMatrix * worldPosition;
        }
    `,

    // Fragment Shader con illuminazione Phong
    phongFragmentShader: `
        precision mediump float;

        varying vec3 v_normal;
        varying vec3 v_worldPosition;
        varying vec2 v_texCoord;

        uniform vec3 u_lightPosition;
        uniform vec3 u_lightColor;
        uniform vec3 u_ambientColor;
        uniform vec3 u_cameraPosition;
        uniform sampler2D u_texture;

        void main() {
            // Normalizzazione della normale
            vec3 normal = normalize(v_normal);

            // Calcolo della direzione della luce
            vec3 lightDirection = normalize(u_lightPosition - v_worldPosition);

            // Calcolo dell'illuminazione diffusa
            float diffuseIntensity = max(dot(normal, lightDirection), 0.0);
            vec3 diffuseColor = u_lightColor * diffuseIntensity;

            // Calcolo dell'illuminazione speculare
            vec3 viewDirection = normalize(u_cameraPosition - v_worldPosition);
            vec3 reflectDirection = reflect(-lightDirection, normal);
            float specularIntensity = pow(max(dot(viewDirection, reflectDirection), 0.0), 32.0);
            vec3 specularColor = u_lightColor * specularIntensity;

            // Colore ambientale
            vec3 ambientColor = u_ambientColor;

            // Applicazione della texture
            vec4 textureColor = texture2D(u_texture, v_texCoord);

            // Colore finale del pixel
            vec3 finalColor = (ambientColor + diffuseColor + specularColor) * textureColor.rgb;

            gl_FragColor = vec4(finalColor, textureColor.a);
        }
    `
};
