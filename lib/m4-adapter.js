// m4-compat.js
// Aggiunge funzioni mancanti alla libreria m4.js per compatibilità

// Verifica che m4 esista
if (typeof m4 !== 'undefined') {
  // Crea un alias per m4.orthographic come m4.ortho se necessario
  if (typeof m4.orthographic === 'function' && typeof m4.ortho !== 'function') {
      m4.ortho = m4.orthographic;
      console.log('Successfully created alias m4.ortho for m4.orthographic');
  } else if (typeof m4.ortho !== 'function') {
      // Implementa m4.ortho se non esiste
      m4.ortho = function(left, right, bottom, top, near, far) {
          return m4.orthographic(left, right, bottom, top, near, far);
      };
  }
  
  // Implementa m4.rotateX se non esiste
  if (typeof m4.rotateX !== 'function') {
      m4.rotateX = function(m, angleInRadians) {
          const c = Math.cos(angleInRadians);
          const s = Math.sin(angleInRadians);
          
          // Crea una copia della matrice originale
          const result = Array.isArray(m) ? [...m] : new Float32Array(m);
          
          // Applica la rotazione intorno all'asse X
          const m10 = m[4];
          const m11 = m[5];
          const m12 = m[6];
          const m13 = m[7];
          const m20 = m[8];
          const m21 = m[9];
          const m22 = m[10];
          const m23 = m[11];
          
          result[4] = c * m10 + s * m20;
          result[5] = c * m11 + s * m21;
          result[6] = c * m12 + s * m22;
          result[7] = c * m13 + s * m23;
          result[8] = c * m20 - s * m10;
          result[9] = c * m21 - s * m11;
          result[10] = c * m22 - s * m12;
          result[11] = c * m23 - s * m13;
          
          return result;
      };
      console.log('Successfully added m4.rotateX function');
  }
  
  // Implementa m4.rotateY se non esiste
  if (typeof m4.rotateY !== 'function') {
      m4.rotateY = function(m, angleInRadians) {
          const c = Math.cos(angleInRadians);
          const s = Math.sin(angleInRadians);
          
          // Crea una copia della matrice originale
          const result = Array.isArray(m) ? [...m] : new Float32Array(m);
          
          // Applica la rotazione intorno all'asse Y
          const m00 = m[0];
          const m01 = m[1];
          const m02 = m[2];
          const m03 = m[3];
          const m20 = m[8];
          const m21 = m[9];
          const m22 = m[10];
          const m23 = m[11];
          
          result[0] = c * m00 - s * m20;
          result[1] = c * m01 - s * m21;
          result[2] = c * m02 - s * m22;
          result[3] = c * m03 - s * m23;
          result[8] = c * m20 + s * m00;
          result[9] = c * m21 + s * m01;
          result[10] = c * m22 + s * m02;
          result[11] = c * m23 + s * m03;
          
          return result;
      };
      console.log('Successfully added m4.rotateY function');
  }
  
  // Implementa m4.rotateZ se non esiste
  if (typeof m4.rotateZ !== 'function') {
      m4.rotateZ = function(m, angleInRadians) {
          const c = Math.cos(angleInRadians);
          const s = Math.sin(angleInRadians);
          
          // Crea una copia della matrice originale
          const result = Array.isArray(m) ? [...m] : new Float32Array(m);
          
          // Applica la rotazione intorno all'asse Z
          const m00 = m[0];
          const m01 = m[1];
          const m02 = m[2];
          const m03 = m[3];
          const m10 = m[4];
          const m11 = m[5];
          const m12 = m[6];
          const m13 = m[7];
          
          result[0] = c * m00 + s * m10;
          result[1] = c * m01 + s * m11;
          result[2] = c * m02 + s * m12;
          result[3] = c * m03 + s * m13;
          result[4] = c * m10 - s * m00;
          result[5] = c * m11 - s * m01;
          result[6] = c * m12 - s * m02;
          result[7] = c * m13 - s * m03;
          
          return result;
      };
      console.log('Successfully added m4.rotateZ function');
  }
  
  // Implementa m4.orthographic se non esiste
  if (typeof m4.orthographic !== 'function' && typeof m4.ortho !== 'function') {
      m4.orthographic = function(left, right, bottom, top, near, far) {
          const width = right - left;
          const height = top - bottom;
          const depth = far - near;
          
          const result = [
              2 / width, 0, 0, 0,
              0, 2 / height, 0, 0,
              0, 0, -2 / depth, 0,
              -(right + left) / width, -(top + bottom) / height, -(far + near) / depth, 1
          ];
          
          return result;
      };
      
      m4.ortho = m4.orthographic;
      console.log('Successfully added m4.orthographic and m4.ortho functions');
  }
}