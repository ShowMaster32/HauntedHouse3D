// glm-adapter.js
// Estende la libreria glm_utils.js con funzioni aggiuntive necessarie per il progetto

// Verifica che glmUtils esista
if (typeof glmUtils === 'undefined') {
    // Se non esiste, crea un oggetto vuoto
    window.glmUtils = {};
    console.log('Creato oggetto glmUtils vuoto');
}

// Estendi glmUtils con funzionalità aggiuntive
(function() {
    console.log('Inizializzazione glm-adapter.js');
    
    // Funzione per caricare un file OBJ e convertirlo in mesh
    if (!glmUtils.loadObj) {
        glmUtils.loadObj = function(objText) {
            // Crea una nuova mesh vuota
            const mesh = {
                vertices: [],
                normals: [],
                texCoords: [],
                indices: [],
                materials: []
            };
            
            // Verifica se esiste la funzione glmReadOBJ (fornita da glm_utils.js)
            if (typeof glmReadOBJ === 'function') {
                // Utilizza la funzione esistente per leggere l'OBJ
                const glmMesh = {
                    vert: [null],
                    normal: [{i: 0, j: 0, k: 0}],
                    textCoords: [{u: 0, v: 0, w: 0}],
                    face: [null],
                    nvert: 0,
                    nface: 0,
                    groups: [],
                    materials: [],
                    facetnorms: []
                };
                
                // Leggi il file OBJ
                glmReadOBJ(objText, glmMesh);
                
                // Converti i dati nel formato atteso
                // Vertici
                for (let i = 1; i < glmMesh.vert.length; i++) {
                    mesh.vertices.push(glmMesh.vert[i].x, glmMesh.vert[i].y, glmMesh.vert[i].z);
                }
                
                // Normali
                for (let i = 1; i < glmMesh.normal.length; i++) {
                    mesh.normals.push(glmMesh.normal[i].i, glmMesh.normal[i].j, glmMesh.normal[i].k);
                }
                
                // Coordinate texture
                for (let i = 1; i < glmMesh.textCoords.length; i++) {
                    mesh.texCoords.push(glmMesh.textCoords[i].u, glmMesh.textCoords[i].v);
                }
                
                // Indici
                for (let i = 1; i < glmMesh.face.length; i++) {
                    mesh.indices.push(glmMesh.face[i].vert[0] - 1, glmMesh.face[i].vert[1] - 1, glmMesh.face[i].vert[2] - 1);
                }
            } else {
                // Implementazione semplificata di un parser OBJ minimale
                console.log('glmReadOBJ non disponibile, parsing minimale OBJ');
                
                const lines = objText.split('\n');
                const vertices = [];
                const normals = [];
                const texCoords = [];
                const vertexIndices = [];
                const normalIndices = [];
                const uvIndices = [];
                
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    
                    // Ignora commenti
                    if (line.startsWith('#')) continue;
                    
                    const parts = line.split(/\s+/);
                    const type = parts[0];
                    
                    if (type === 'v') {
                        // Vertice
                        vertices.push(
                            parseFloat(parts[1]),
                            parseFloat(parts[2]),
                            parseFloat(parts[3])
                        );
                    } else if (type === 'vn') {
                        // Normale
                        normals.push(
                            parseFloat(parts[1]),
                            parseFloat(parts[2]),
                            parseFloat(parts[3])
                        );
                    } else if (type === 'vt') {
                        // Coordinata texture
                        texCoords.push(
                            parseFloat(parts[1]),
                            parts.length > 2 ? parseFloat(parts[2]) : 0
                        );
                    } else if (type === 'f') {
                        // Faccia - gestisce formati: f v/vt/vn, f v//vn, f v/vt, f v
                        for (let j = 1; j < Math.min(parts.length, 4); j++) {
                            const indices = parts[j].split('/');
                            
                            vertexIndices.push(parseInt(indices[0]) - 1);
                            
                            if (indices.length > 1 && indices[1] !== '') {
                                uvIndices.push(parseInt(indices[1]) - 1);
                            }
                            
                            if (indices.length > 2) {
                                normalIndices.push(parseInt(indices[2]) - 1);
                            }
                        }
                        
                        // Se è un quad (4 vertici), aggiungere un secondo triangolo
                        if (parts.length > 4) {
                            const indices1 = parts[1].split('/');
                            const indices3 = parts[3].split('/');
                            const indices4 = parts[4].split('/');
                            
                            vertexIndices.push(parseInt(indices1[0]) - 1);
                            vertexIndices.push(parseInt(indices3[0]) - 1);
                            vertexIndices.push(parseInt(indices4[0]) - 1);
                            
                            if (indices1.length > 1 && indices1[1] !== '' && 
                                indices3.length > 1 && indices3[1] !== '' && 
                                indices4.length > 1 && indices4[1] !== '') {
                                uvIndices.push(parseInt(indices1[1]) - 1);
                                uvIndices.push(parseInt(indices3[1]) - 1);
                                uvIndices.push(parseInt(indices4[1]) - 1);
                            }
                            
                            if (indices1.length > 2 && indices3.length > 2 && indices4.length > 2) {
                                normalIndices.push(parseInt(indices1[2]) - 1);
                                normalIndices.push(parseInt(indices3[2]) - 1);
                                normalIndices.push(parseInt(indices4[2]) - 1);
                            }
                        }
                    }
                }
                
                // Organizza i dati nel formato richiesto
                mesh.vertices = new Float32Array(vertices);
                mesh.indices = new Uint16Array(vertexIndices);
                
                if (normals.length > 0 && normalIndices.length === vertexIndices.length) {
                    const indexedNormals = new Array(vertices.length);
                    for (let i = 0; i < normalIndices.length; i++) {
                        const vertexIndex = vertexIndices[i] * 3;
                        const normalIndex = normalIndices[i] * 3;
                        
                        indexedNormals[vertexIndex] = normals[normalIndex];
                        indexedNormals[vertexIndex + 1] = normals[normalIndex + 1];
                        indexedNormals[vertexIndex + 2] = normals[normalIndex + 2];
                    }
                    mesh.normals = new Float32Array(indexedNormals.filter(n => n !== undefined));
                } else {
                    // Genera normali piatte se non disponibili
                    mesh.normals = new Float32Array(vertices.length);
                }
                
                if (texCoords.length > 0 && uvIndices.length === vertexIndices.length) {
                    const indexedTexCoords = new Array(vertices.length / 3 * 2);
                    for (let i = 0; i < uvIndices.length; i++) {
                        const vertexIndex = vertexIndices[i] * 2;
                        const uvIndex = uvIndices[i] * 2;
                        
                        indexedTexCoords[vertexIndex] = texCoords[uvIndex];
                        indexedTexCoords[vertexIndex + 1] = texCoords[uvIndex + 1];
                    }
                    mesh.texCoords = new Float32Array(indexedTexCoords.filter(t => t !== undefined));
                } else {
                    // Genera coordinate texture di default se non disponibili
                    mesh.texCoords = new Float32Array(vertices.length / 3 * 2);
                }
            }
            
            return mesh;
        };
    }
    
    console.log('glm-adapter.js caricato con successo');
})();