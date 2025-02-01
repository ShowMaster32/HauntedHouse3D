// glm_utils.js
// Utility functions inspired by GLM (OpenGL Mathematics) for 3D graphics

/**
 * Vector 3 operations
 */
const vec3 = {
   /**
    * Create a new 3D vector
    * @param {number} x - X coordinate
    * @param {number} y - Y coordinate
    * @param {number} z - Z coordinate
    * @returns {Float32Array} A new 3D vector
    */
   create: function(x = 0, y = 0, z = 0) {
       return new Float32Array([x, y, z]);
   },

   /**
    * Add two vectors
    * @param {Float32Array} a - First vector
    * @param {Float32Array} b - Second vector
    * @returns {Float32Array} Resulting vector
    */
   add: function(a, b) {
       return new Float32Array([
           a[0] + b[0],
           a[1] + b[1],
           a[2] + b[2]
       ]);
   },

   /**
    * Subtract two vectors
    * @param {Float32Array} a - First vector
    * @param {Float32Array} b - Second vector
    * @returns {Float32Array} Resulting vector
    */
   subtract: function(a, b) {
       return new Float32Array([
           a[0] - b[0],
           a[1] - b[1],
           a[2] - b[2]
       ]);
   },

   /**
    * Compute dot product of two vectors
    * @param {Float32Array} a - First vector
    * @param {Float32Array} b - Second vector
    * @returns {number} Dot product
    */
   dot: function(a, b) {
       return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
   },

   /**
    * Compute cross product of two vectors
    * @param {Float32Array} a - First vector
    * @param {Float32Array} b - Second vector
    * @returns {Float32Array} Cross product vector
    */
   cross: function(a, b) {
       return new Float32Array([
           a[1] * b[2] - a[2] * b[1],
           a[2] * b[0] - a[0] * b[2],
           a[0] * b[1] - a[1] * b[0]
       ]);
   },

   /**
    * Normalize a vector
    * @param {Float32Array} v - Input vector
    * @returns {Float32Array} Normalized vector
    */
   normalize: function(v) {
       const length = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
       if (length > 0) {
           return new Float32Array([
               v[0] / length,
               v[1] / length,
               v[2] / length
           ]);
       }
       return new Float32Array([0, 0, 0]);
   },

   /**
    * Compute vector length
    * @param {Float32Array} v - Input vector
    * @returns {number} Vector length
    */
   length: function(v) {
       return Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
   }
};

/**
* Matrix 4 operations
*/
const mat4 = {
   /**
    * Create an identity matrix
    * @returns {Float32Array} Identity matrix
    */
   identity: function() {
       return new Float32Array([
           1, 0, 0, 0,
           0, 1, 0, 0,
           0, 0, 1, 0,
           0, 0, 0, 1
       ]);
   },

   /**
    * Multiply two 4x4 matrices
    * @param {Float32Array} a - First matrix
    * @param {Float32Array} b - Second matrix
    * @returns {Float32Array} Resulting matrix
    */
   multiply: function(a, b) {
       const result = new Float32Array(16);
       
       for (let i = 0; i < 4; i++) {
           for (let j = 0; j < 4; j++) {
               result[i*4 + j] = 
                   a[i*4 + 0] * b[0*4 + j] +
                   a[i*4 + 1] * b[1*4 + j] +
                   a[i*4 + 2] * b[2*4 + j] +
                   a[i*4 + 3] * b[3*4 + j];
           }
       }
       
       return result;
   },

   /**
    * Create a translation matrix
    * @param {number} x - X translation
    * @param {number} y - Y translation
    * @param {number} z - Z translation
    * @returns {Float32Array} Translation matrix
    */
   translate: function(x, y, z) {
       const m = this.identity();
       m[12] = x;
       m[13] = y;
       m[14] = z;
       return m;
   },

   /**
    * Create a scale matrix
    * @param {number} x - X scale
    * @param {number} y - Y scale
    * @param {number} z - Z scale
    * @returns {Float32Array} Scale matrix
    */
   scale: function(x, y, z) {
       const m = this.identity();
       m[0] = x;
       m[5] = y;
       m[10] = z;
       return m;
   },

   /**
    * Create a rotation matrix around X axis
    * @param {number} angleInRadians - Rotation angle
    * @returns {Float32Array} Rotation matrix
    */
   rotateX: function(angleInRadians) {
       const c = Math.cos(angleInRadians);
       const s = Math.sin(angleInRadians);
       
       const m = this.identity();
       m[5] = c;
       m[6] = -s;
       m[9] = s;
       m[10] = c;
       return m;
   },

   /**
    * Create a rotation matrix around Y axis
    * @param {number} angleInRadians - Rotation angle
    * @returns {Float32Array} Rotation matrix
    */
   rotateY: function(angleInRadians) {
       const c = Math.cos(angleInRadians);
       const s = Math.sin(angleInRadians);
       
       const m = this.identity();
       m[0] = c;
       m[2] = s;
       m[8] = -s;
       m[10] = c;
       return m;
   },

   /**
    * Create a rotation matrix around Z axis
    * @param {number} angleInRadians - Rotation angle
    * @returns {Float32Array} Rotation matrix
    */
   rotateZ: function(angleInRadians) {
       const c = Math.cos(angleInRadians);
       const s = Math.sin(angleInRadians);
       
       const m = this.identity();
       m[0] = c;
       m[1] = -s;
       m[4] = s;
       m[5] = c;
       return m;
   },

   /**
    * Create a perspective projection matrix
    * @param {number} fieldOfViewInRadians - Field of view
    * @param {number} aspectRatio - Aspect ratio of the viewport
    * @param {number} near - Near clipping plane
    * @param {number} far - Far clipping plane
    * @returns {Float32Array} Projection matrix
    */
   perspective: function(fieldOfViewInRadians, aspectRatio, near, far) {
       const f = 1.0 / Math.tan(fieldOfViewInRadians / 2);
       const rangeInv = 1.0 / (near - far);

       const m = new Float32Array(16);
       m[0] = f / aspectRatio;
       m[1] = 0;
       m[2] = 0;
       m[3] = 0;
       m[4] = 0;
       m[5] = f;
       m[6] = 0;
       m[7] = 0;
       m[8] = 0;
       m[9] = 0;
       m[10] = (far + near) * rangeInv;
       m[11] = -1;
       m[12] = 0;
       m[13] = 0;
       m[14] = far * near * rangeInv * 2;
       m[15] = 0;

       return m;
   }
};

/**
* Conversion utilities
*/
const glmUtils = {
   /**
    * Convert degrees to radians
    * @param {number} degrees - Angle in degrees
    * @returns {number} Angle in radians
    */
   toRadians: function(degrees) {
       return degrees * (Math.PI / 180);
   },

   /**
    * Convert radians to degrees
    * @param {number} radians - Angle in radians
    * @returns {number} Angle in degrees
    */
   toDegrees: function(radians) {
       return radians * (180 / Math.PI);
   }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
   module.exports = {
       vec3,
       mat4,
       glmUtils
   };
}