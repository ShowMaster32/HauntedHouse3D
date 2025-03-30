// glm-adapter.js
// Aggiunge definizioni mancanti per il loader OBJ

// Definisci le classi mancanti
function nvr() {
    this.x = 0;
    this.y = 0;
    this.z = 0;
}

function nfc() {
    this.n_v_e = 0;
    this.vert = [0, 0, 0]; // Inizializza con array di default
    this.textCoordsIndex = [0, 0, 0];
    this.normalVertexIndex = [0, 0, 0];
    this.normalFaceIndex = 0;
    this.group = 0;
    this.material = 0;
}

// Aggiungi un alias per texture2D usando texture
if (typeof texture2D === 'undefined' && typeof texture !== 'undefined') {
    window.texture2D = texture;
}

// Crea l'oggetto glmUtils se non esiste
window.glmUtils = window.glmUtils || {};

// Aggiungi la funzione loadObj semplificata
window.glmUtils.loadObj = function(text) {
    // Crea strutture dati semplificate
    const lines = text.split("\n");
    const vertices = [];
    const normals = [];
    const texCoords = [];
    const indices = [];
    
    // Indici temporanei per il parsing
    const tempVertices = [];
    const tempNormals = [];
    const tempTexCoords = [];
    
    // Aggiungi valori dummy all'indice 0 (gli indici OBJ partono da 1)
    tempVertices.push([0,0,0]);
    tempNormals.push([0,0,0]);
    tempTexCoords.push([0,0]);
    
    for (let j=0; j<lines.length; j++) {
        const line = lines[j].trim();
        if (line === '' || line.startsWith('#')) continue;
        
        const parts = line.split(/\s+/);
        
        switch(parts[0]) {
            case 'v': // vertice
                tempVertices.push([
                    parseFloat(parts[1]), 
                    parseFloat(parts[2]), 
                    parseFloat(parts[3])
                ]);
                break;
            case 'vn': // normale
                tempNormals.push([
                    parseFloat(parts[1]), 
                    parseFloat(parts[2]), 
                    parseFloat(parts[3])
                ]);
                break;
            case 'vt': // coordinate texture
                tempTexCoords.push([
                    parseFloat(parts[1]), 
                    parts.length > 2 ? parseFloat(parts[2]) : 0
                ]);
                break;
            case 'f': // faccia
                // Supporta sia triangoli che quad
                const faceIndices = [];
                
                // Parsing faccia
                for (let i = 1; i < parts.length; i++) {
                    const indices = parts[i].split('/');
                    const vertIndex = parseInt(indices[0]) || 0;
                    const texIndex = indices.length > 1 ? parseInt(indices[1]) || 0 : 0;
                    const normIndex = indices.length > 2 ? parseInt(indices[2]) || 0 : 0;
                    
                    faceIndices.push({
                        v: vertIndex,
                        t: texIndex,
                        n: normIndex
                    });
                }
                
                // Triangolazione
                for (let i = 0; i < faceIndices.length - 2; i++) {
                    // Per ogni triangolo nella faccia
                    const points = [
                        faceIndices[0],
                        faceIndices[i+1],
                        faceIndices[i+2]
                    ];
                    
                    // Aggiungi i punti al buffer
                    for (const point of points) {
                        if (point.v > 0 && point.v < tempVertices.length) {
                            const vertex = tempVertices[point.v];
                            vertices.push(vertex[0], vertex[1], vertex[2]);
                            
                            // Aggiungi normali se disponibili
                            if (point.n > 0 && point.n < tempNormals.length) {
                                const normal = tempNormals[point.n];
                                normals.push(normal[0], normal[1], normal[2]);
                            } else if (tempNormals.length > 1) {
                                // Usa la prima normale disponibile
                                normals.push(tempNormals[1][0], tempNormals[1][1], tempNormals[1][2]);
                            } else {
                                // Normale di default
                                normals.push(0, 1, 0);
                            }
                            
                            // Aggiungi coordinate texture se disponibili
                            if (point.t > 0 && point.t < tempTexCoords.length) {
                                const texCoord = tempTexCoords[point.t];
                                texCoords.push(texCoord[0], texCoord[1]);
                            } else {
                                // Coordinate texture di default
                                texCoords.push(0, 0);
                            }
                            
                            // Aggiungi indice
                            indices.push(indices.length);
                        }
                    }
                }
                break;
        }
    }
    
    console.log(`Parsed OBJ with ${vertices.length/3} vertices, ${indices.length} indices`);
    
    return {
        vertices: new Float32Array(vertices),
        normals: new Float32Array(normals),
        texCoords: new Float32Array(texCoords),
        indices: new Uint16Array(indices)
    };
};

console.log('glm-adapter caricato: nvr, nfc e glmUtils.loadObj definiti');