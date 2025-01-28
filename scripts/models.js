// models.js

/**
 * Carica una texture da un URL.
 * @param {WebGLRenderingContext} gl - Il contesto WebGL
 * @param {string} url - L'URL della texture da caricare
 * @returns {WebGLTexture} La texture caricata
 */
export function loadTexture(gl, url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Pixel temporaneo grigio scuro mentre la texture carica
    const pixel = new Uint8Array([64, 64, 64, 255]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

    const image = new Image();
    image.crossOrigin = "anonymous";  // Importante per CORS
    image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        
        // Genera mipmaps per texture di qualità migliore
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        
        // Impostazioni per ripetizione texture
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        
        gl.generateMipmap(gl.TEXTURE_2D);
    };
    image.src = url;
    return texture;
}

/**
 * Crea un piano (per pareti, pavimento, soffitto)
 * @param {WebGLRenderingContext} gl - Il contesto WebGL
 * @param {number} width - Larghezza
 * @param {number} height - Altezza
 * @param {WebGLTexture} texture - La texture da applicare
 */
export function createWall(gl, width, height, texture) {
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    // Vertici del piano
    const vertices = new Float32Array([
        -halfWidth, -halfHeight, 0.0,  // Bottom left
        halfWidth, -halfHeight, 0.0,   // Bottom right
        halfWidth, halfHeight, 0.0,    // Top right
        -halfWidth, halfHeight, 0.0    // Top left
    ]);

    // Coordinate texture (ripetute)
    const texCoords = new Float32Array([
        0.0, 0.0,
        4.0, 0.0,  // ripeti la texture 4 volte
        4.0, 4.0,
        0.0, 4.0
    ]);

    // Normali (assicurati che puntino verso l'osservatore)
    const normals = new Float32Array([
        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0
    ]);

    // Indici per disegnare i triangoli
    const indices = new Uint16Array([
        0, 1, 2,    // First triangle
        0, 2, 3     // Second triangle
    ]);

    // Crea i buffer
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    return {
        position: vertexBuffer,
        texcoord: texCoordBuffer,
        normal: normalBuffer,
        indices: indexBuffer,
        texture: texture,
        numElements: indices.length
    };
}

/**
 * Crea un pavimento/soffitto (usa la stessa funzione di createWall)
 */
export function createFloor(gl, width, depth, texture) {
    return createWall(gl, width, depth, texture);
}

/**
 * Disegna un modello.
 */
export function drawModel(gl, programInfo, model, modelViewMatrix) {
    // Posizioni
    gl.bindBuffer(gl.ARRAY_BUFFER, model.position);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition,
        3,
        gl.FLOAT,
        false,
        0,
        0
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

    // Texture coordinates
    gl.bindBuffer(gl.ARRAY_BUFFER, model.texcoord);
    gl.vertexAttribPointer(
        programInfo.attribLocations.textureCoord,
        2,
        gl.FLOAT,
        false,
        0,
        0
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);

    // Normali
    gl.bindBuffer(gl.ARRAY_BUFFER, model.normal);
    gl.vertexAttribPointer(
        programInfo.attribLocations.normal,
        3,
        gl.FLOAT,
        false,
        0,
        0
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.normal);

    // Indici
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indices);

    // Set uniforms
    gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);

    // Bind texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, model.texture);
    gl.uniform1i(programInfo.uniformLocations.sampler, 0);

    // Draw
    gl.drawElements(gl.TRIANGLES, model.numElements, gl.UNSIGNED_SHORT, 0);
}

// Funzioni di utilità
function isPowerOf2(value) {
    return (value & (value - 1)) === 0;
}

// Export delle funzioni per disegnare pareti e pavimento
export const drawWall = drawModel;
export const drawFloor = drawModel;