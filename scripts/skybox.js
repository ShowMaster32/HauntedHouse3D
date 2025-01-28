import { loadTexture } from './models.js';

export function createSkybox(gl) {
    // Vertici del cubo esterno per la skybox
    const vertices = new Float32Array([
        // Front
        -1.0,  1.0, -1.0,
         1.0,  1.0, -1.0,
        -1.0, -1.0, -1.0,
         1.0, -1.0, -1.0,
        // Back
        -1.0,  1.0,  1.0,
         1.0,  1.0,  1.0,
        -1.0, -1.0,  1.0,
         1.0, -1.0,  1.0,
        // Top
        -1.0,  1.0, -1.0,
         1.0,  1.0, -1.0,
        -1.0,  1.0,  1.0,
         1.0,  1.0,  1.0,
        // Bottom
        -1.0, -1.0, -1.0,
         1.0, -1.0, -1.0,
        -1.0, -1.0,  1.0,
         1.0, -1.0,  1.0,
        // Right
         1.0, -1.0, -1.0,
         1.0,  1.0, -1.0,
         1.0, -1.0,  1.0,
         1.0,  1.0,  1.0,
        // Left
        -1.0, -1.0, -1.0,
        -1.0,  1.0, -1.0,
        -1.0, -1.0,  1.0,
        -1.0,  1.0,  1.0,
    ]);

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Carica le texture per ogni faccia della skybox
    const textures = {
        front: loadTexture(gl, 'textures/skybox/pz.png'),  // Positive Z
        back: loadTexture(gl, 'textures/skybox/nz.png'),   // Negative Z
        up: loadTexture(gl, 'textures/skybox/py.png'),     // Positive Y
        down: loadTexture(gl, 'textures/skybox/ny.png'),   // Negative Y
        right: loadTexture(gl, 'textures/skybox/px.png'),  // Positive X
        left: loadTexture(gl, 'textures/skybox/nx.png')    // Negative X
    };

    return {
        vertexBuffer,
        textures,
        draw(gl, programInfo, viewMatrix, projectionMatrix) {
            gl.useProgram(programInfo.program);
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
            
            // Disabilita depth write per la skybox
            gl.depthMask(false);
            
            // Imposta gli attributi e le uniformi
            gl.vertexAttribPointer(
                programInfo.attribLocations.vertexPosition,
                3,
                gl.FLOAT,
                false,
                0,
                0
            );
            gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

            // Imposta le matrici
            gl.uniformMatrix4fv(
                programInfo.uniformLocations.projectionMatrix,
                false,
                projectionMatrix
            );
            gl.uniformMatrix4fv(
                programInfo.uniformLocations.modelViewMatrix,
                false,
                viewMatrix
            );

            // Disegna ogni faccia della skybox
            gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 3);

            // Riabilita depth write
            gl.depthMask(true);
        }
    };
}