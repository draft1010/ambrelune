import { findPath } from "./navigation.js";

// Walking animation follows distance travelled, never a proximity timer.
export function stepNpc(n, dt, player, blocked) {
  n.walkCycle ??= 0;
  n.wait ??= n.phase % 3;
  n.stop ??= 0;
  n.path ??= [];
  const distance = Math.hypot(player.x - n.x, player.z - n.z);
  if (distance < 2.7)
    return {
      moving: false,
      facing: Math.atan2(player.x - n.x, player.z - n.z),
    };
  if (n.wait > 0) {
    n.wait -= dt;
    return { moving: false };
  }
  if (!n.path.length) {
    n.stop = (n.stop + 1) % n.route.length;
    n.path = findPath(n, n.route[n.stop], (x, z) => blocked(x, z, 0.3));
    if (!n.path.length) {
      n.wait = 1;
      return { moving: false };
    }
  }
  const target = n.path[0],
    dx = target.x - n.x,
    dz = target.z - n.z;
  const remaining = Math.hypot(dx, dz),
    stride = Math.min(remaining, dt * 1.35);
  const x = n.x + (dx / (remaining || 1)) * stride,
    z = n.z + (dz / (remaining || 1)) * stride;
  if (blocked(x, z, 0.28)) {
    n.path = [];
    n.wait = 0.6;
    return { moving: false };
  }
  n.x = x;
  n.z = z;
  n.walkCycle += stride / 1.35;
  if (remaining <= stride + 0.01) {
    n.path.shift();
    if (!n.path.length) n.wait = 2.5 + (n.phase % 3);
  }
  return { moving: stride > 0.0001, facing: Math.atan2(dx, dz) };
}
