export const riverX = (z) => 19 + Math.sin(z * 0.04) * 1.5;
export function baseTerrainHeight(x, z) {
  let h = Math.max(
    0.1,
    0.35 +
      Math.sin(x * 0.075) * 0.45 +
      Math.cos(z * 0.085) * 0.32 +
      Math.max(0, -z - 12) * 0.058 +
      Math.exp(-((x - 43) ** 2 + (z + 34) ** 2) / 500) * 3.5,
  );
  const terrace = Math.max(0, Math.min(1, (8 - x) / 5));
  h += terrace * Math.max(0, Math.min(1, (-z - 31) / 4)) * 2.6;
  const dist = Math.abs(x - riverX(z));
  if (dist < 4.7) return -0.85;
  if (dist < 7) h *= Math.min(1, (dist - 4.7) / 2.3);
  return h;
}
export const onBridge = (x,z) => x>=11 && x<=28 && (Math.abs(z-8)<1.95 || Math.abs(z+30)<1.95);
export function bridgeHeight(x,z) {
 const center=Math.abs(z-8)<Math.abs(z+30)?8:-30;
 const t=Math.max(0,Math.min(1,(x-11)/17));
 return baseTerrainHeight(11,center)*(1-t)+baseTerrainHeight(28,center)*t + Math.sin(t*Math.PI)*.65;
}
export function terrainHeight(x,z) {
 const raw=baseTerrainHeight(x,z),d=Math.hypot(x-43,z+39);
 const t=Math.max(0,Math.min(1,(d-5.7)/2));
 const shrine=baseTerrainHeight(43,-39)*(1-t)+raw*t;
 return onBridge(x,z) ? Math.min(shrine,bridgeHeight(x,z)-.2) : shrine;
}
export function height(x,z) {
 if(onBridge(x,z))return bridgeHeight(x,z);
 const ground=terrainHeight(x,z);
 return ground + (Math.hypot(x-43,z+39)<5.5 ? .36 : 0);
}
// Clearance includes crowns and roots, not only tree trunk centers.
export const clearLandmark = (x,z) => Math.hypot(x-43,z+39)<10 || (Math.abs(x+9)<9 && Math.abs(z+55)<9) || (x>7 && x<33 && (Math.abs(z-8)<5 || Math.abs(z+30)<5));
