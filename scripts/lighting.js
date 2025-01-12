/**
 * Modulo per la gestione delle luci nel contesto WebGL.
 */
export const Lighting = {
    /**
     * Crea una luce puntuale.
     * @param {WebGLRenderingContext} gl - Il contesto WebGL.
     * @param {Array<number>} position - Posizione della luce [x, y, z].
     * @param {Array<number>} color - Colore della luce [r, g, b].
     * @returns {Object} Oggetto luce puntuale.
     */
    createPointLight(gl, position = [0, 0, 0], color = [1.0, 1.0, 1.0]) {
        console.log(`[Lighting] Creazione luce puntuale con posizione: ${position} e colore: ${color}`);
        return {
            position,
            color,
            intensity: 1.0,
            updateUniforms(program, gl) {
                console.log(`[Lighting] Aggiornamento uniform per luce puntuale.`);
                const lightPositionLocation = gl.getUniformLocation(program, "uLightPosition");
                const lightColorLocation = gl.getUniformLocation(program, "uLightColor");
                const lightIntensityLocation = gl.getUniformLocation(program, "uLightIntensity");

                if (lightPositionLocation) {
                    gl.uniform3fv(lightPositionLocation, this.position);
                    console.log(`[Lighting] Uniform uLightPosition aggiornata: ${this.position}`);
                }
                if (lightColorLocation) {
                    gl.uniform3fv(lightColorLocation, this.color);
                    console.log(`[Lighting] Uniform uLightColor aggiornata: ${this.color}`);
                }
                if (lightIntensityLocation) {
                    gl.uniform1f(lightIntensityLocation, this.intensity);
                    console.log(`[Lighting] Uniform uLightIntensity aggiornata: ${this.intensity}`);
                }
            },
        };
    },

    /**
     * Crea una luce direzionale.
     * @param {WebGLRenderingContext} gl - Il contesto WebGL.
     * @param {Array<number>} direction - Direzione della luce [x, y, z].
     * @param {Array<number>} color - Colore della luce [r, g, b].
     * @returns {Object} Oggetto luce direzionale.
     */
    createDirectionalLight(gl, direction = [0, -1, 0], color = [1.0, 1.0, 1.0]) {
        console.log(`[Lighting] Creazione luce direzionale con direzione: ${direction} e colore: ${color}`);
        return {
            direction,
            color,
            intensity: 1.0,
            updateUniforms(program, gl) {
                console.log(`[Lighting] Aggiornamento uniform per luce direzionale.`);
                const lightDirectionLocation = gl.getUniformLocation(program, "uLightDirection");
                const lightColorLocation = gl.getUniformLocation(program, "uLightColor");
                const lightIntensityLocation = gl.getUniformLocation(program, "uLightIntensity");

                if (lightDirectionLocation) {
                    gl.uniform3fv(lightDirectionLocation, this.direction);
                    console.log(`[Lighting] Uniform uLightDirection aggiornata: ${this.direction}`);
                }
                if (lightColorLocation) {
                    gl.uniform3fv(lightColorLocation, this.color);
                    console.log(`[Lighting] Uniform uLightColor aggiornata: ${this.color}`);
                }
                if (lightIntensityLocation) {
                    gl.uniform1f(lightIntensityLocation, this.intensity);
                    console.log(`[Lighting] Uniform uLightIntensity aggiornata: ${this.intensity}`);
                }
            },
        };
    },

    /**
     * Applica l'illuminazione al programma shader.
     * @param {WebGLRenderingContext} gl - Il contesto WebGL.
     * @param {WebGLProgram} program - Il programma shader corrente.
     * @param {Array<Object>} lights - Array di luci da applicare.
     */
    applyLighting(gl, program, lights) {
        console.log(`[Lighting] Applicazione illuminazione. Numero di luci: ${lights.length}`);
        if (!Array.isArray(lights)) {
            console.warn("[Lighting] L'array delle luci non è valido.");
            return;
        }

        lights.forEach((light, index) => {
            if (light && typeof light.updateUniforms === "function") {
                console.log(`[Lighting] Applicazione della luce all'indice ${index}.`);
                light.updateUniforms(program, gl);
            } else {
                console.warn(`[Lighting] Luce non valida trovata all'indice ${index}.`);
            }
        });
    },
};

/**
 * Abilita il rendering avanzato.
 */
export function enableAdvancedRendering() {
    console.log("[Lighting] Rendering avanzato abilitato.");
    // Configura impostazioni avanzate qui.
}

/**
 * Disabilita il rendering avanzato.
 */
export function disableAdvancedRendering() {
    console.log("[Lighting] Rendering avanzato disabilitato.");
    // Ripristina impostazioni base qui.
}

console.log("[Lighting] Modulo caricato correttamente.");
