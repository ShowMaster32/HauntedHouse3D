// lighting.js
import { Vector3 } from './math.js';

export const Lighting = {
    /**
     * Crea una luce puntuale.
     * @param {WebGLRenderingContext} gl - Il contesto WebGL
     * @param {number[]} position - Posizione della luce [x, y, z]
     * @param {number[]} color - Colore della luce [r, g, b]
     * @returns {Object} La luce puntuale creata
     */
    createPointLight(gl, position = [0, 0, 0], color = [1.0, 1.0, 1.0]) {
        return {
            type: 'point',
            position: new Vector3(...position),
            color: new Vector3(...color),
            intensity: 1.0,
            attenuation: 0.1,
            enabled: true,

            // Aggiorna gli uniform dello shader per questa luce
            updateUniforms(program) {
                const lightPositionLocation = gl.getUniformLocation(program, 'uLightPosition');
                const lightColorLocation = gl.getUniformLocation(program, 'uLightColor');
                const lightIntensityLocation = gl.getUniformLocation(program, 'uLightIntensity');
                const lightAttenuationLocation = gl.getUniformLocation(program, 'uLightAttenuation');
                const lightEnabledLocation = gl.getUniformLocation(program, 'uLightEnabled');

                if (lightPositionLocation) {
                    gl.uniform3fv(lightPositionLocation, this.position.toArray());
                }
                if (lightColorLocation) {
                    gl.uniform3fv(lightColorLocation, this.color.toArray());
                }
                if (lightIntensityLocation) {
                    gl.uniform1f(lightIntensityLocation, this.intensity);
                }
                if (lightAttenuationLocation) {
                    gl.uniform1f(lightAttenuationLocation, this.attenuation);
                }
                if (lightEnabledLocation) {
                    gl.uniform1i(lightEnabledLocation, this.enabled ? 1 : 0);
                }
            }
        };
    },

    /**
     * Crea una luce direzionale.
     * @param {WebGLRenderingContext} gl - Il contesto WebGL
     * @param {number[]} direction - Direzione della luce [x, y, z]
     * @param {number[]} color - Colore della luce [r, g, b]
     * @returns {Object} La luce direzionale creata
     */
    createDirectionalLight(gl, direction = [0, -1, 0], color = [1.0, 1.0, 1.0]) {
        return {
            type: 'directional',
            direction: new Vector3(...direction).normalize(),
            color: new Vector3(...color),
            intensity: 1.0,
            enabled: true,

            updateUniforms(program) {
                const lightDirectionLocation = gl.getUniformLocation(program, 'uLightDirection');
                const lightColorLocation = gl.getUniformLocation(program, 'uLightColor');
                const lightIntensityLocation = gl.getUniformLocation(program, 'uLightIntensity');
                const lightEnabledLocation = gl.getUniformLocation(program, 'uLightEnabled');

                if (lightDirectionLocation) {
                    gl.uniform3fv(lightDirectionLocation, this.direction.toArray());
                }
                if (lightColorLocation) {
                    gl.uniform3fv(lightColorLocation, this.color.toArray());
                }
                if (lightIntensityLocation) {
                    gl.uniform1f(lightIntensityLocation, this.intensity);
                }
                if (lightEnabledLocation) {
                    gl.uniform1i(lightEnabledLocation, this.enabled ? 1 : 0);
                }
            }
        };
    },

    /**
     * Crea un effetto di flickering per una luce.
     * @param {Object} light - La luce da far sfarfallare
     * @param {number} intensity - Intensità dello sfarfallio
     * @param {number} speed - Velocità dello sfarfallio
     */
    createFlickeringEffect(light, intensity = 0.2, speed = 0.1) {
        let time = 0;
        
        return {
            update(deltaTime) {
                time += deltaTime * speed;
                const noise = Math.sin(time) * 0.5 + Math.sin(time * 2.1) * 0.3 + Math.sin(time * 4.7) * 0.2;
                light.intensity = 1.0 + noise * intensity;
            }
        };
    },

    /**
     * Applica le luci alla scena.
     * @param {WebGLRenderingContext} gl - Il contesto WebGL
     * @param {WebGLProgram} program - Il programma shader
     * @param {Object[]} lights - Array di luci da applicare
     */
    applyLighting(gl, program, lights) {
        // Imposta il numero massimo di luci supportate
        const maxLights = Math.min(lights.length, 4); // Supporta fino a 4 luci
        gl.uniform1i(gl.getUniformLocation(program, 'uNumLights'), maxLights);

        // Aggiorna gli uniform per ogni luce
        for (let i = 0; i < maxLights; i++) {
            const light = lights[i];
            if (light && light.updateUniforms) {
                light.updateUniforms(program);
            }
        }
    },

    /**
     * Abilita il rendering avanzato.
     * @param {WebGLRenderingContext} gl - Il contesto WebGL
     * @param {Object} options - Opzioni di rendering avanzato
     */
    enableAdvancedRendering(gl, options = {}) {
        // Abilita il blending per effetti di trasparenza
        if (options.enableTransparency) {
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        }

        // Abilita il depth testing per il corretto rendering 3D
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);

        // Abilita il face culling per ottimizzare il rendering
        if (options.enableFaceCulling) {
            gl.enable(gl.CULL_FACE);
            gl.cullFace(gl.BACK);
        }
    },

    /**
     * Disabilita il rendering avanzato.
     * @param {WebGLRenderingContext} gl - Il contesto WebGL
     */
    disableAdvancedRendering(gl) {
        gl.disable(gl.BLEND);
        gl.disable(gl.CULL_FACE);
        // Mantiene il depth testing abilitato per il corretto rendering 3D
    }
};

// Export delle funzioni di utility per l'illuminazione
export function calculateNormals(vertices, indices) {
    const normals = new Array(vertices.length).fill(0);
    
    for (let i = 0; i < indices.length; i += 3) {
        const i1 = indices[i] * 3;
        const i2 = indices[i + 1] * 3;
        const i3 = indices[i + 2] * 3;
        
        // Calcola i vettori dei lati del triangolo
        const v1 = new Vector3(
            vertices[i2] - vertices[i1],
            vertices[i2 + 1] - vertices[i1 + 1],
            vertices[i2 + 2] - vertices[i1 + 2]
        );
        
        const v2 = new Vector3(
            vertices[i3] - vertices[i1],
            vertices[i3 + 1] - vertices[i1 + 1],
            vertices[i3 + 2] - vertices[i1 + 2]
        );
        
        // Calcola la normale del triangolo usando il prodotto vettoriale
        const normal = v1.cross(v2).normalize();
        
        // Aggiungi la normale ai vertici
        normals[i1] += normal.x;
        normals[i1 + 1] += normal.y;
        normals[i1 + 2] += normal.z;
        
        normals[i2] += normal.x;
        normals[i2 + 1] += normal.y;
        normals[i2 + 2] += normal.z;
        
        normals[i3] += normal.x;
        normals[i3 + 1] += normal.y;
        normals[i3 + 2] += normal.z;
    }
    
    // Normalizza tutte le normali
    for (let i = 0; i < normals.length; i += 3) {
        const normal = new Vector3(normals[i], normals[i + 1], normals[i + 2]).normalize();
        normals[i] = normal.x;
        normals[i + 1] = normal.y;
        normals[i + 2] = normal.z;
    }
    
    return normals;
}