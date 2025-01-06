// Carica una texture da un URL
export function loadTexture(gl, url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Placeholder iniziale per texture non caricate
    const placeholder = new Uint8Array([255, 255, 255, 255]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, placeholder);

    const image = new Image();
    image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
    };
    image.src = url;

    return texture;
}

// Crea una parete con larghezza, altezza e texture specificate
export function createWall(gl, width, height, texture) {
    const positions = [
        -width / 2, -height / 2, 0.0,
        width / 2, -height / 2, 0.0,
        width / 2, height / 2, 0.0,
        -width / 2, height / 2, 0.0,
    ];

    const texCoords = [
        0.0, 0.0,
        1.0, 0.0,
        1.0, 1.0,
        0.0, 1.0,
    ];

    const indices = [
        0, 1, 2,
        0, 2, 3,
    ];

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    return {
        positionBuffer,
        texCoordBuffer,
        indexBuffer,
        vertexCount: indices.length,
        texture,
    };
}

// Crea un pavimento (o soffitto) con larghezza, profondità e texture specificate
export function createFloor(gl, width, depth, texture) {
    return createWall(gl, width, depth, texture); // Riutilizza la logica di `createWall`
}

// Carica i modelli della stanza
export function loadModels(gl) {
    const wallTexture = loadTexture(gl, './textures/wall.jpg');
    const floorTexture = loadTexture(gl, './textures/wood.jpg');
    const ceilingTexture = loadTexture(gl, './textures/ceiling.jpg');

    const walls = [
        createWall(gl, 20, 10, wallTexture),  // Parete frontale
        createWall(gl, 20, 10, wallTexture),  // Parete posteriore
        createWall(gl, 25, 10, wallTexture),  // Parete sinistra
        createWall(gl, 25, 10, wallTexture),  // Parete destra
    ];

    const floor = createFloor(gl, 20, 25, floorTexture);
    const ceiling = createFloor(gl, 20, 25, ceilingTexture);

    return { walls, floor, ceiling };
}

// Disegna un pavimento o soffitto usando la funzione `drawWall`
export function drawFloor(gl, programInfo, floor, modelViewMatrix) {
    drawWall(gl, programInfo, floor, modelViewMatrix);
}

// Disegna una parete
export function drawWall(gl, programInfo, wall, modelViewMatrix) {
    gl.bindBuffer(gl.ARRAY_BUFFER, wall.positionBuffer);
    gl.vertexAttribPointer(programInfo.attribLocations.aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.aPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, wall.texCoordBuffer);
    gl.vertexAttribPointer(programInfo.attribLocations.aTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.aTexCoord);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, wall.indexBuffer);

    gl.uniformMatrix4fv(programInfo.uniformLocations.uModelViewMatrix, false, modelViewMatrix);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, wall.texture);
    gl.uniform1i(programInfo.uniformLocations.uTexture, 0);

    gl.drawElements(gl.TRIANGLES, wall.vertexCount, gl.UNSIGNED_SHORT, 0);
}
