// mesh_utils.js
// Utility functions for working with 3D meshes in WebGL

/**
 * Create a simple cube mesh
 * @returns {Object} An object containing vertices, indices, and normals for a cube
 */
function createCubeMesh() {
  const vertices = [
      // Front face
      -1.0, -1.0,  1.0,
       1.0, -1.0,  1.0,
       1.0,  1.0,  1.0,
      -1.0,  1.0,  1.0,
      
      // Back face
      -1.0, -1.0, -1.0,
      -1.0,  1.0, -1.0,
       1.0,  1.0, -1.0,
       1.0, -1.0, -1.0,
      
      // Top face
      -1.0,  1.0, -1.0,
      -1.0,  1.0,  1.0,
       1.0,  1.0,  1.0,
       1.0,  1.0, -1.0,
      
      // Bottom face
      -1.0, -1.0, -1.0,
       1.0, -1.0, -1.0,
       1.0, -1.0,  1.0,
      -1.0, -1.0,  1.0,
      
      // Right face
       1.0, -1.0, -1.0,
       1.0,  1.0, -1.0,
       1.0,  1.0,  1.0,
       1.0, -1.0,  1.0,
      
      // Left face
      -1.0, -1.0, -1.0,
      -1.0, -1.0,  1.0,
      -1.0,  1.0,  1.0,
      -1.0,  1.0, -1.0
  ];

  const indices = [
      0,  1,  2,      0,  2,  3,    // front
      4,  5,  6,      4,  6,  7,    // back
      8,  9,  10,     8,  10, 11,   // top
      12, 13, 14,     12, 14, 15,   // bottom
      16, 17, 18,     16, 18, 19,   // right
      20, 21, 22,     20, 22, 23    // left
  ];

  const normals = [
      // Front
      0.0,  0.0,  1.0,
      0.0,  0.0,  1.0,
      0.0,  0.0,  1.0,
      0.0,  0.0,  1.0,
      
      // Back
      0.0,  0.0, -1.0,
      0.0,  0.0, -1.0,
      0.0,  0.0, -1.0,
      0.0,  0.0, -1.0,
      
      // Top
      0.0,  1.0,  0.0,
      0.0,  1.0,  0.0,
      0.0,  1.0,  0.0,
      0.0,  1.0,  0.0,
      
      // Bottom
      0.0, -1.0,  0.0,
      0.0, -1.0,  0.0,
      0.0, -1.0,  0.0,
      0.0, -1.0,  0.0,
      
      // Right
      1.0,  0.0,  0.0,
      1.0,  0.0,  0.0,
      1.0,  0.0,  0.0,
      1.0,  0.0,  0.0,
      
      // Left
      -1.0,  0.0,  0.0,
      -1.0,  0.0,  0.0,
      -1.0,  0.0,  0.0,
      -1.0,  0.0,  0.0
  ];

  return { vertices, indices, normals };
}

/**
* Parse a simple .obj file format
* @param {string} objText - The contents of the .obj file as a string
* @returns {Object} An object containing vertices, indices, and normals
*/
function parseOBJ(objText) {
  const vertices = [];
  const indices = [];
  const normals = [];
  const lines = objText.split('\n');

  lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      
      if (parts[0] === 'v') {
          // Vertex coordinates
          vertices.push(
              parseFloat(parts[1]),
              parseFloat(parts[2]),
              parseFloat(parts[3])
          );
      } else if (parts[0] === 'vn') {
          // Normal coordinates
          normals.push(
              parseFloat(parts[1]),
              parseFloat(parts[2]),
              parseFloat(parts[3])
          );
      } else if (parts[0] === 'f') {
          // Face indices (assumes triangulated mesh)
          for (let i = 1; i <= 3; i++) {
              const vertexInfo = parts[i].split('/');
              // OBJ indices are 1-based, so subtract 1
              const vertexIndex = parseInt(vertexInfo[0]) - 1;
              indices.push(vertexIndex);
          }
      }
  });

  return { vertices, indices, normals };
}

/**
* Compute the bounding box of a mesh
* @param {Float32Array|Array} vertices - Array of vertex coordinates
* @returns {Object} Bounding box with min and max coordinates
*/
function computeBoundingBox(vertices) {
  if (vertices.length === 0) {
      return { 
          min: [0, 0, 0], 
          max: [0, 0, 0] 
      };
  }

  let minX = vertices[0], maxX = vertices[0];
  let minY = vertices[1], maxY = vertices[1];
  let minZ = vertices[2], maxZ = vertices[2];

  for (let i = 3; i < vertices.length; i += 3) {
      // X coordinate
      minX = Math.min(minX, vertices[i]);
      maxX = Math.max(maxX, vertices[i]);

      // Y coordinate
      minY = Math.min(minY, vertices[i + 1]);
      maxY = Math.max(maxY, vertices[i + 1]);

      // Z coordinate
      minZ = Math.min(minZ, vertices[i + 2]);
      maxZ = Math.max(maxZ, vertices[i + 2]);
  }

  return {
      min: [minX, minY, minZ],
      max: [maxX, maxY, maxZ]
  };
}

/**
* Normalize mesh vertices to fit within a unit cube
* @param {Float32Array|Array} vertices - Array of vertex coordinates
* @returns {Float32Array} Normalized vertex coordinates
*/
function normalizeMesh(vertices) {
  const boundingBox = computeBoundingBox(vertices);
  const min = boundingBox.min;
  const max = boundingBox.max;

  // Compute the center and scale
  const center = [
      (min[0] + max[0]) / 2,
      (min[1] + max[1]) / 2,
      (min[2] + max[2]) / 2
  ];

  const scale = Math.max(
      max[0] - min[0],
      max[1] - min[1],
      max[2] - min[2]
  );

  // Create a new array for normalized vertices
  const normalizedVertices = new Float32Array(vertices.length);

  for (let i = 0; i < vertices.length; i += 3) {
      normalizedVertices[i]     = (vertices[i]     - center[0]) / scale;
      normalizedVertices[i + 1] = (vertices[i + 1] - center[1]) / scale;
      normalizedVertices[i + 2] = (vertices[i + 2] - center[2]) / scale;
  }

  return normalizedVertices;
}

// Export functions if using modules, otherwise they'll be globally available
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
      createCubeMesh,
      parseOBJ,
      computeBoundingBox,
      normalizeMesh
  };
}