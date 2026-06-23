import { Player } from './player';
import { TrafficManager } from './traffic';

/**
 * AABB collision — slightly shrunk to make close calls feel exciting.
 */
export function checkCollision(player: Player, traffic: TrafficManager): boolean {
  const px = player.x;
  const pz = player.worldZ;
  const pHW = player.halfWidth * 0.82;
  const pHD = player.halfDepth * 0.80;

  for (const car of traffic.getActiveCars()) {
    const cx = car.mesh.position.x;
    const cz = car.worldZ;
    if (
      Math.abs(px - cx) < pHW + car.halfWidth * 0.82 &&
      Math.abs(pz - cz) < pHD + car.halfDepth * 0.78
    ) return true;
  }
  return false;
}
