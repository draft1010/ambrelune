// A* on a one-metre navigation grid. Diagonal edges never cut collider corners.
export function findPath(start, end, blocked) {
  const sx = Math.round(start.x),
    sz = Math.round(start.z),
    ex = Math.round(end.x),
    ez = Math.round(end.z);
  if (blocked(ex, ez)) return [];
  const key = (x, z) => `${x},${z}`,
    heuristic = (x, z) => Math.hypot(ex - x, ez - z),
    heap = [],
    best = new Map(),
    closed = new Set();
  function push(n) {
    heap.push(n);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p].f <= n.f) break;
      heap[i] = heap[p];
      i = p;
    }
    heap[i] = n;
  }
  function pop() {
    const first = heap[0],
      last = heap.pop();
    if (heap.length) {
      let i = 0;
      while (true) {
        let c = i * 2 + 1;
        if (c >= heap.length) break;
        if (c + 1 < heap.length && heap[c + 1].f < heap[c].f) c++;
        if (heap[c].f >= last.f) break;
        heap[i] = heap[c];
        i = c;
      }
      heap[i] = last;
    }
    return first;
  }
  push({ x: sx, z: sz, g: 0, f: heuristic(sx, sz), parent: null });
  best.set(key(sx, sz), 0);
  let steps = 0;
  while (heap.length && steps++ < 18000) {
    const n = pop(),
      k = key(n.x, n.z);
    if (closed.has(k)) continue;
    closed.add(k);
    if (n.x === ex && n.z === ez) {
      const path = [];
      let q = n;
      while (q.parent) {
        path.push({ x: q.x, z: q.z });
        q = q.parent;
      }
      return path.reverse();
    }
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++) {
        if (!dx && !dz) continue;
        const x = n.x + dx,
          z = n.z + dz;
        if (Math.abs(x) > 67 || z < -66 || z > 61 || blocked(x, z)) continue;
        if (dx && dz && (blocked(n.x + dx, n.z) || blocked(n.x, n.z + dz)))
          continue;
        const k2 = key(x, z),
          g = n.g + Math.hypot(dx, dz);
        if (g >= (best.get(k2) ?? Infinity)) continue;
        best.set(k2, g);
        push({ x, z, g, f: g + heuristic(x, z), parent: n });
      }
  }
  return [];
}
