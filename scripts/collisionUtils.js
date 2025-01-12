/**
 * Verifica la collisione tra il giocatore e una sfera.
 * @param {Object} playerPosition - Posizione del giocatore {x, y, z}.
 * @param {Object} objectPosition - Posizione dell'oggetto {x, y, z}.
 * @param {number} objectRadius - Raggio dell'oggetto.
 * @param {number} [playerRadius=0.35] - Raggio del giocatore (default: 0.35).
 * @returns {boolean} - True se c'è una collisione, false altrimenti.
 */
export function checkCollisionWithSphere(playerPosition, objectPosition, objectRadius, playerRadius = 0.35) {
    console.log("[CollisionUtils] Inizio verifica collisione con sfera.");
    console.log(`[CollisionUtils] Parametri ricevuti: playerPosition=${JSON.stringify(playerPosition)}, objectPosition=${JSON.stringify(objectPosition)}, objectRadius=${objectRadius}, playerRadius=${playerRadius}`);

    // Validazione dei parametri
    if (!playerPosition || !objectPosition || typeof objectRadius !== 'number') {
        console.error("[CollisionUtils] Parametri non validi in checkCollisionWithSphere.");
        return false;
    }

    // Calcolo delle differenze tra le coordinate
    const dx = playerPosition.x - objectPosition.x;
    const dy = playerPosition.y - objectPosition.y;
    const dz = playerPosition.z - objectPosition.z;

    // Log delle coordinate
    console.log(`[CollisionUtils] Differenze coordinate: dx=${dx}, dy=${dy}, dz=${dz}`);

    // Calcolo della distanza tra il giocatore e l'oggetto
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    console.log(`[CollisionUtils] Distanza calcolata: ${distance}`);

    // Verifica della collisione
    const collision = distance < (objectRadius + playerRadius);
    console.log(`[CollisionUtils] Risultato collisione: ${collision}`);
    return collision;
}
