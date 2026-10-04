import {SPECIES} from './data.js';
export function wildZone(x,z){return ((x>29&&x<60&&z>-53&&z<52)||(x>-55&&x<6&&z>-63&&z<-57)) && Math.hypot(x-43,z+39)>11 && Math.hypot(x+9,z+55)>10;}
export function chooseEncounter(rng=Math.random,blocked=()=>false,occupied=[],preferred=null){
 const pool=SPECIES.filter(s=>s.id!=='gardien');
 for(let attempt=0;attempt<500;attempt++){
  const weights=pool.map(s=>1/s.rarity),total=weights.reduce((a,b)=>a+b,0);let roll=rng()*total;let s=pool[pool.length-1];for(let i=0;i<pool.length;i++){roll-=weights[i];if(roll<=0){s=pool[i];break;}}
  if(preferred)s=pool.find(s=>s.id===preferred)||s;
  const north=/nord/.test(s.habitat)||(!/est|orientales|Rives|Carrière|Ruines/.test(s.habitat)&&s.element!=='eau'&&rng()<.3);
  const x=north?-55+rng()*61:(s.element==='eau'?29+rng()*5:30+rng()*30);
  const z=north?-62.8+rng()*5.5:-52+rng()*103;
  if(!wildZone(x,z)||blocked(x,z,2.6)||occupied.some(w=>Math.hypot(x-w.homeX,z-w.homeZ)<6))continue;
  return {id:s.id,x,z,homeX:x,homeZ:z,level:2+Math.floor(rng()*4),phase:rng()*Math.PI*2};
 }
 return null;
}
