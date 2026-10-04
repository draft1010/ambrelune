// Additive content: existing save identifiers keep their original meaning.
export const CROPS = {
  seed: { name: 'Roselle', item: 'crop', seconds: 84, color: '#cf7b97' },
  wheatSeed: { name: 'Blé', item: 'wheat', seconds: 110, color: '#e9c46a' },
  carrotSeed: { name: 'Carotte', item: 'carrot', seconds: 95, color: '#db8843' },
  flaxSeed: { name: 'Lin', item: 'flax', seconds: 125, color: '#9eabd8' },
  pumpkinSeed: { name: 'Courge', item: 'pumpkin', seconds: 155, color: '#d7a14f' },
};
export const BUILDABLES = ['lamp','fence','bench','bed','workbench','sleepingBed','chest','furnace','table','chair','shelf','rug','stove','wardrobe','composter'];
export const BAG_SLOTS = 24;
export const STORAGE_SLOTS = { chest: 30, shelf: 18, wardrobe: 24 };
export function stackLimit(id) {
  if (BUILDABLES.includes(id)) return 5;
  if (['wood','stone','fiber','crystal','plank','ore','coal','iron','cloth','flour'].includes(id)) return 50;
  return 20;
}
export function slotsUsed(container = {}) {
  return Object.entries(container).reduce((sum,[id,n]) => sum + (n > 0 ? Math.ceil(n / stackLimit(id)) : 0), 0);
}
export function slotStacks(container = {}, capacity = BAG_SLOTS) {
  const out = [];
  for (const [id,raw] of Object.entries(container)) {
    let n = Math.max(0, Math.floor(raw || 0));
    const lim = stackLimit(id);
    while (n > 0) { const count = Math.min(lim,n); out.push({id,count,limit:lim}); n -= count; }
  }
  while (out.length < capacity) out.push(null);
  return out;
}
export function canStore(container,id,count,capacity=BAG_SLOTS) {
  if (!Number.isFinite(count) || count < 0) return false;
  if (!count) return true;
  const lim = stackLimit(id);
  const existing = Math.max(0, Math.floor(container?.[id] || 0));
  const used = slotsUsed(container);
  const partial = existing > 0 && existing % lim ? lim - (existing % lim) : 0;
  const freeSlots = Math.max(0, capacity - used);
  return count <= partial + freeSlots * lim;
}
export function addToContainer(container,id,count,capacity=BAG_SLOTS) {
  if (!canStore(container,id,count,capacity)) return false;
  container[id] = (container[id] || 0) + count;
  return true;
}
export function storageCapacity(type) { return STORAGE_SLOTS[type] || 0; }
export const LABELS = { wheatSeed:'Graines de blé', carrotSeed:'Graines de carotte', flaxSeed:'Graines de lin', pumpkinSeed:'Graines de courge', wheat:'Blé', carrot:'Carottes', flax:'Lin', pumpkin:'Courges', ore:'Minerai de fer', coal:'Charbon', iron:'Lingots de fer', cloth:'Toile de lin', flour:'Farine', bread:'Pain', stew:'Ragoût du jardin', grilledFish:'Poisson grillé', sleepingBed:'Lit en bois', chest:'Coffre', furnace:'Fonderie', table:'Table', chair:'Chaise', shelf:'Étagère', rug:'Tapis tissé', stove:'Four de cuisine', wardrobe:'Armoire', composter:'Composteur' };
export const EXTRA_RECIPES = [
 ['coal','Charbon de bois',{wood:3},2,'Combustible pour la fonderie.'],
 ['iron','Lingot de fer',{ore:3,coal:1},1,'Le minerai fond au feu du charbon.','furnace'],
 ['cloth','Toile de lin',{flax:3},1,'Une toile souple pour le mobilier.','workbench'],
 ['flour','Farine',{wheat:2},1,'Du blé moulu pour la cuisine.'],
 ['bread','Pain de campagne',{flour:2,wood:1},2,'Rend 18 PV à votre compagnon.','stove'],
 ['stew','Ragoût du jardin',{carrot:2,pumpkin:1,wood:1},2,'Rend 45 PV à votre compagnon.','stove'],
 ['grilledFish','Truite grillée',{fish:1,wood:1},1,'Rend 30 PV et 10 énergie.','stove'],
 ['sleepingBed','Lit en bois',{plank:6,cloth:3},1,'Se reposer jusqu’au matin ou jusqu’au soir.','workbench'],
 ['chest','Coffre de rangement',{plank:4,iron:1},1,'Conserve vos ressources. Récupérable une fois vide.','workbench'],
 ['furnace','Fonderie de pierre',{stone:16,wood:4},1,'Transforme le minerai et le charbon en lingots.'],
 ['stove','Four de cuisine',{stone:10,iron:2},1,'Prépare pains, poissons et ragoûts.','workbench'],
 ['table','Table en frêne',{plank:4},1,'Une grande table pour votre maison.','workbench'],
 ['chair','Chaise en bois',{plank:2,fiber:2},1,'Une assise à placer près de la table.','workbench'],
 ['shelf','Étagère murale',{plank:4,iron:1},1,'Un rangement pour vos objets.','workbench'],
 ['rug','Tapis de lin',{cloth:4,fiber:3},1,'Une touche de douceur sous les pieds.','workbench'],
 ['wardrobe','Armoire en frêne',{plank:8,iron:2},1,'Un rangement spacieux pour la maison.','workbench'],
 ['composter','Composteur',{wood:6,fiber:3},1,'Valorise les récoltes en compost.'],
 ['fertilizer','Compost de récolte',{carrot:1,fiber:2},3,'Un amendement riche pour les cultures.','composter'],
].map(([id,name,cost,count,desc,station])=>({id,name,cost,count,desc,station}));
export const FOOD = {bread:18,stew:45,grilledFish:30};
export const spaceOf = b => b.location || 'world';
export function footprint(type, r=0) {
 // Placement footprints mirror the visible meshes so furniture can sit truly flush to walls.
 const size={sleepingBed:[1.85,2.5],chest:[1.7,1],furnace:[1.6,1.2],table:[2.4,1.5],chair:[.8,.8],shelf:[2,.65],rug:[2.8,2],stove:[1.6,1.2],wardrobe:[1.7,1],composter:[1.5,1.5],lamp:[.5,.5],fence:[1.9,.3],bed:[1.8,1],workbench:[1.9,.8],bench:[1.9,.8]}[type]||[1.9,1];
 return Math.abs(Math.sin(r))>.5?[size[1],size[0]]:size;
}
export function furnitureBlocks(b,x,z,r=.4,y=0,location='world') {
 if(spaceOf(b)!==location || Math.abs((b.y||0)-y)>1 || b.type==='rug') return false;
 const [w,d]=footprint(b.type,b.r);
 return Math.abs(x-b.x)<w/2+r && Math.abs(z-b.z)<d/2+r;
}
export function stationAvailable(s,station) {
 if(!station) return true;
 const loc=s.location||'world';
 if(station==='workbench' && loc==='world' && Math.hypot(s.player.x+40,s.player.z-32)<4) return true;
 return s.buildings.some(b=>b.type===station && spaceOf(b)===loc && Math.abs((b.y||0)-(s.player.y||0))<1 && Math.hypot(b.x-s.player.x,b.z-s.player.z)<4);
}
export function transfer(s,b,id,count,toChest) {
 if(!['chest','shelf','wardrobe'].includes(b?.type) || !Number.isInteger(count)||count<1) return false;
 b.storage ||= {};
 const from=toChest?s.inventory:b.storage, to=toChest?b.storage:s.inventory;
 const capacity=toChest?storageCapacity(b.type):BAG_SLOTS;
 if((from[id]||0)<count || !canStore(to,id,count,capacity)) return false;
 from[id]-=count;
 if(from[id]<=0) delete from[id];
 to[id]=(to[id]||0)+count;
 return true;
}
export function recover(s,index) {
 const b=s.buildings[index];
 if(!b || Object.values(b.storage||{}).some(n=>n>0) || !canStore(s.inventory,b.type,1,BAG_SLOTS)) return false;
 s.inventory[b.type]=(s.inventory[b.type]||0)+1;
 s.buildings.splice(index,1); return true;
}
