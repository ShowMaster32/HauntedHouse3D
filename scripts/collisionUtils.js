export function checkCollisionWithSphere(playerPosition, objectPosition, objectRadius) {
    const dx = playerPosition.x - objectPosition.x;
    const dy = playerPosition.y - objectPosition.y;
    const dz = playerPosition.z - objectPosition.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    return distance < objectRadius + 0.35;
}
