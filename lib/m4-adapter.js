// m4-adapter.js
// Estende la libreria m4.js con funzioni aggiuntive necessarie per il progetto

// Verifica che m4 esista
if (typeof m4 === 'undefined') {
    console.error('Errore: m4.js deve essere caricato prima di m4-adapter.js');
} else {
    console.log('Inizializzazione m4-adapter.js');
    
    // Aggiungi le funzioni mancanti a m4
    
    // Funzione rotateX - ruota una matrice attorno all'asse X
    m4.rotateX = function(m, angleInRadians) {
        const c = Math.cos(angleInRadians);
        const s = Math.sin(angleInRadians);
        
        // Crea una copia della matrice
        const result = m4.copy(m);
        
        // Applica la rotazione attorno all'asse X
        const m10 = result[4];
        const m11 = result[5];
        const m12 = result[6];
        const m13 = result[7];
        const m20 = result[8];
        const m21 = result[9];
        const m22 = result[10];
        const m23 = result[11];
        
        // Effettua la rotazione
        result[4] = m10 * c + m20 * s;
        result[5] = m11 * c + m21 * s;
        result[6] = m12 * c + m22 * s;
        result[7] = m13 * c + m23 * s;
        result[8] = m20 * c - m10 * s;
        result[9] = m21 * c - m11 * s;
        result[10] = m22 * c - m12 * s;
        result[11] = m23 * c - m13 * s;
        
        return result;
    };
    
    // Funzione rotateY - ruota una matrice attorno all'asse Y
    m4.rotateY = function(m, angleInRadians) {
        const c = Math.cos(angleInRadians);
        const s = Math.sin(angleInRadians);
        
        // Crea una copia della matrice
        const result = m4.copy(m);
        
        // Applica la rotazione attorno all'asse Y
        const m00 = result[0];
        const m01 = result[1];
        const m02 = result[2];
        const m03 = result[3];
        const m20 = result[8];
        const m21 = result[9];
        const m22 = result[10];
        const m23 = result[11];
        
        // Effettua la rotazione
        result[0] = m00 * c - m20 * s;
        result[1] = m01 * c - m21 * s;
        result[2] = m02 * c - m22 * s;
        result[3] = m03 * c - m23 * s;
        result[8] = m00 * s + m20 * c;
        result[9] = m01 * s + m21 * c;
        result[10] = m02 * s + m22 * c;
        result[11] = m03 * s + m23 * c;
        
        return result;
    };
    
    // Funzione rotateZ - ruota una matrice attorno all'asse Z
    m4.rotateZ = function(m, angleInRadians) {
        const c = Math.cos(angleInRadians);
        const s = Math.sin(angleInRadians);
        
        // Crea una copia della matrice
        const result = m4.copy(m);
        
        // Applica la rotazione attorno all'asse Z
        const m00 = result[0];
        const m01 = result[1];
        const m02 = result[2];
        const m03 = result[3];
        const m10 = result[4];
        const m11 = result[5];
        const m12 = result[6];
        const m13 = result[7];
        
        // Effettua la rotazione
        result[0] = m00 * c + m10 * s;
        result[1] = m01 * c + m11 * s;
        result[2] = m02 * c + m12 * s;
        result[3] = m03 * c + m13 * s;
        result[4] = m10 * c - m00 * s;
        result[5] = m11 * c - m01 * s;
        result[6] = m12 * c - m02 * s;
        result[7] = m13 * c - m03 * s;
        
        return result;
    };
    
    // Funzione copy - crea una copia di una matrice 4x4
    if (!m4.copy) {
        m4.copy = function(m) {
            return m.slice();
        };
    }
    
    // Funzione ortho/orthographic - crea una matrice di proiezione ortografica
    if (!m4.ortho && !m4.orthographic) {
        m4.ortho = m4.orthographic = function(left, right, bottom, top, near, far) {
            const width = right - left;
            const height = top - bottom;
            const depth = far - near;
            
            const result = m4.identity();
            
            result[0] = 2 / width;
            result[5] = 2 / height;
            result[10] = -2 / depth;
            result[12] = -(left + right) / width;
            result[13] = -(top + bottom) / height;
            result[14] = -(near + far) / depth;
            
            return result;
        };
    }
    
    // Funzione inverse - calcola l'inversa di una matrice 4x4
    if (!m4.inverse) {
        m4.inverse = function(m) {
            const m00 = m[0 * 4 + 0];
            const m01 = m[0 * 4 + 1];
            const m02 = m[0 * 4 + 2];
            const m03 = m[0 * 4 + 3];
            const m10 = m[1 * 4 + 0];
            const m11 = m[1 * 4 + 1];
            const m12 = m[1 * 4 + 2];
            const m13 = m[1 * 4 + 3];
            const m20 = m[2 * 4 + 0];
            const m21 = m[2 * 4 + 1];
            const m22 = m[2 * 4 + 2];
            const m23 = m[2 * 4 + 3];
            const m30 = m[3 * 4 + 0];
            const m31 = m[3 * 4 + 1];
            const m32 = m[3 * 4 + 2];
            const m33 = m[3 * 4 + 3];
            
            const tmp_0 = m22 * m33;
            const tmp_1 = m32 * m23;
            const tmp_2 = m12 * m33;
            const tmp_3 = m32 * m13;
            const tmp_4 = m12 * m23;
            const tmp_5 = m22 * m13;
            const tmp_6 = m02 * m33;
            const tmp_7 = m32 * m03;
            const tmp_8 = m02 * m23;
            const tmp_9 = m22 * m03;
            const tmp_10 = m02 * m13;
            const tmp_11 = m12 * m03;
            const tmp_12 = m20 * m31;
            const tmp_13 = m30 * m21;
            const tmp_14 = m10 * m31;
            const tmp_15 = m30 * m11;
            const tmp_16 = m10 * m21;
            const tmp_17 = m20 * m11;
            const tmp_18 = m00 * m31;
            const tmp_19 = m30 * m01;
            const tmp_20 = m00 * m21;
            const tmp_21 = m20 * m01;
            const tmp_22 = m00 * m11;
            const tmp_23 = m10 * m01;
            
            const t0 = (tmp_0 * m11 + tmp_3 * m21 + tmp_4 * m31) -
                (tmp_1 * m11 + tmp_2 * m21 + tmp_5 * m31);
            const t1 = (tmp_1 * m01 + tmp_6 * m21 + tmp_9 * m31) -
                (tmp_0 * m01 + tmp_7 * m21 + tmp_8 * m31);
            const t2 = (tmp_2 * m01 + tmp_7 * m11 + tmp_10 * m31) -
                (tmp_3 * m01 + tmp_6 * m11 + tmp_11 * m31);
            const t3 = (tmp_5 * m01 + tmp_8 * m11 + tmp_11 * m21) -
                (tmp_4 * m01 + tmp_9 * m11 + tmp_10 * m21);
            
            const d = 1.0 / (m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3);
            
            return [
                d * t0,
                d * t1,
                d * t2,
                d * t3,
                d * ((tmp_1 * m10 + tmp_2 * m20 + tmp_5 * m30) -
                    (tmp_0 * m10 + tmp_3 * m20 + tmp_4 * m30)),
                d * ((tmp_0 * m00 + tmp_7 * m20 + tmp_8 * m30) -
                    (tmp_1 * m00 + tmp_6 * m20 + tmp_9 * m30)),
                d * ((tmp_3 * m00 + tmp_6 * m10 + tmp_11 * m30) -
                    (tmp_2 * m00 + tmp_7 * m10 + tmp_10 * m30)),
                d * ((tmp_4 * m00 + tmp_9 * m10 + tmp_10 * m20) -
                    (tmp_5 * m00 + tmp_8 * m10 + tmp_11 * m20)),
                d * ((tmp_12 * m13 + tmp_15 * m23 + tmp_16 * m33) -
                    (tmp_13 * m13 + tmp_14 * m23 + tmp_17 * m33)),
                d * ((tmp_13 * m03 + tmp_18 * m23 + tmp_21 * m33) -
                    (tmp_12 * m03 + tmp_19 * m23 + tmp_20 * m33)),
                d * ((tmp_14 * m03 + tmp_19 * m13 + tmp_22 * m33) -
                    (tmp_15 * m03 + tmp_18 * m13 + tmp_23 * m33)),
                d * ((tmp_17 * m03 + tmp_20 * m13 + tmp_23 * m23) -
                    (tmp_16 * m03 + tmp_21 * m13 + tmp_22 * m23)),
                d * ((tmp_14 * m22 + tmp_17 * m32 + tmp_13 * m12) -
                    (tmp_16 * m32 + tmp_12 * m12 + tmp_15 * m22)),
                d * ((tmp_20 * m32 + tmp_12 * m02 + tmp_19 * m22) -
                    (tmp_18 * m22 + tmp_21 * m32 + tmp_13 * m02)),
                d * ((tmp_18 * m12 + tmp_23 * m32 + tmp_15 * m02) -
                    (tmp_22 * m32 + tmp_14 * m02 + tmp_19 * m12)),
                d * ((tmp_22 * m22 + tmp_16 * m02 + tmp_21 * m12) -
                    (tmp_20 * m12 + tmp_23 * m22 + tmp_17 * m02))
            ];
        };
    }
    
    // Funzione transpose - calcola la trasposta di una matrice 4x4
    if (!m4.transpose) {
        m4.transpose = function(m) {
            return [
                m[0], m[4], m[8], m[12],
                m[1], m[5], m[9], m[13],
                m[2], m[6], m[10], m[14],
                m[3], m[7], m[11], m[15]
            ];
        };
    }
    
    console.log('m4-adapter.js caricato con successo');
}