export const Lighting = {
    /**
     * Inizializza una luce puntuale.
     * @param {WebGLRenderingContext} gl - Il contesto WebGL.
     * @param {Array<number>} position - Posizione della luce [x, y, z].
     * @param {Array<number>} color - Colore della luce [r, g, b].
     * @returns {Object} Oggetto luce puntuale.
     */
    createPointLight(gl, position, color) {
        return {
            position: position || [0, 0, 0],
            color: color || [1.0, 1.0, 1.0],
            intensity: 1.0,
            updateUniforms(program, gl) {
                const lightPositionLocation = gl.getUniformLocation(program, "uLightPosition");
                const lightColorLocation = gl.getUniformLocation(program, "uLightColor");
                const lightIntensityLocation = gl.getUniformLocation(program, "uLightIntensity");

                gl.uniform3fv(lightPositionLocation, this.position);
                gl.uniform3fv(lightColorLocation, this.color);
                gl.uniform1f(lightIntensityLocation, this.intensity);
            },
        };
    },

    /**
     * Inizializza una luce direzionale.
     * @param {WebGLRenderingContext} gl - Il contesto WebGL.
     * @param {Array<number>} direction - Direzione della luce [x, y, z].
     * @param {Array<number>} color - Colore della luce [r, g, b].
     * @returns {Object} Oggetto luce direzionale.
     */
    createDirectionalLight(gl, direction, color) {
        return {
            direction: direction || [0, -1, 0],
            color: color || [1.0, 1.0, 1.0],
            intensity: 1.0,
            updateUniforms(program, gl) {
                const lightDirectionLocation = gl.getUniformLocation(program, "uLightDirection");
                const lightColorLocation = gl.getUniformLocation(program, "uLightColor");
                const lightIntensityLocation = gl.getUniformLocation(program, "uLightIntensity");

                gl.uniform3fv(lightDirectionLocation, this.direction);
                gl.uniform3fv(lightColorLocation, this.color);
                gl.uniform1f(lightIntensityLocation, this.intensity);
            },
        };
    },

    /**
     * Aggiorna l'effetto di sfarfallio per una luce.
     * @param {Object} light - L'oggetto luce da sfarfallare.
     * @param {number} duration - Durata totale dello sfarfallio (ms).
     */
    flickerLight(light, duration) {
        const flickerCount = Math.floor(Math.random() * 5) + 3; // Numero casuale di sfarfallii
        const interval = duration / flickerCount;

        let toggle = true;
        let count = 0;

        const flickerInterval = setInterval(() => {
            light.intensity = toggle ? 0.8 : 1.2;
            toggle = !toggle;
            count++;

            if (count >= flickerCount) {
                clearInterval(flickerInterval);
                light.intensity = 1.0; // Torna alla luminosità normale
            }
        }, interval);
    },

    /**
     * Applica l'illuminazione al programma shader.
     * @param {WebGLRenderingContext} gl - Il contesto WebGL.
     * @param {WebGLProgram} program - Il programma shader corrente.
     * @param {Array<Object>} lights - Array di luci da applicare.
     */
    applyLighting(gl, program, lights) {
        lights.forEach((light) => {
            if (light.updateUniforms) {
                light.updateUniforms(program, gl);
            }
        });
    },
};
