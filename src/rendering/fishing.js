import {T,Factory} from './art.js';
export class FishingSession {
 constructor(scene,player,x,z,onFinish){
  this.scene=scene;this.player=player;this.onFinish=onFinish;this.elapsed=0;this.phase='cast';this.tension=.25;this.progress=0;this.holding=false;this.finished=false;this.wait=2+Math.random()*2.5;
  player.rotation.y=Math.atan2(x-player.position.x,z-player.position.z);
  this.landStart=new T.Vector3();this.landEnd=new T.Vector3();
  this.root=new T.Group();scene.add(this.root);const f=new Factory(this.root);
  this.bobber=f.part('sphere','#ebbe74',x,-.2,z,.11,.15,.11);
  this.rod=f.part('cylinder','#90734e',player.position.x,player.position.y+1.4,player.position.z,.025,2.2,.025,0,0,-.7);
  this.rod.position.set(0,.95,.3);this.rod.rotation.set(.3,0,0);player.userData.arms[1].add(this.rod);
  this.tip=new T.Vector3();this.hiddenTool=player.getObjectByName('HeldTool');if(this.hiddenTool)this.hiddenTool.visible=false;
  player.userData.whenReady?.then(()=>{if(!this.finished)player.userData.arms[1].add(this.rod);}).catch(()=>{});
  this.line=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3(),new T.Vector3()]),new T.LineBasicMaterial({color:'#ded3b4'}));this.root.add(this.line);
  this.catchMesh=new T.Group();const cf=new Factory(this.catchMesh);
  cf.part('sphere','#d8a45d',0,0,0,.25,.11,.085);
  cf.part('cone','#c28b48',-.27,0,0,.12,.18,.07,0,0,Math.PI/2);
  cf.part('sphere','#263b35',.16,.03,.07,.018,.018,.018);
  this.catchMesh.visible=false;this.root.add(this.catchMesh);
  this.target=new T.Vector3(x,-.2,z);
  this.panel=document.createElement('section');this.panel.className='fishing-panel';this.panel.innerHTML='<span class="eyebrow">SUR LES RIVES DE L’AMBRE</span><h2 id="fishPhase">Lancer la ligne…</h2><p id="fishHelp">Le flotteur rejoint l’eau.</p><div class="tension-track"><span></span><i id="fishNeedle"></i></div><progress id="fishProgress" max="1" value="0" aria-label="Poisson ramené"></progress><div class="card-actions"><button id="fishHold">Ferrer / ramener</button><button id="fishCancel">Ranger la canne</button></div>';
  document.body.append(this.panel);
  const button=this.panel.querySelector('#fishHold');
  button.onpointerdown=e=>{button.setPointerCapture(e.pointerId);this.press();};
  button.onpointerup=button.onpointercancel=()=>this.holding=false;
  this.panel.querySelector('#fishCancel').onclick=()=>this.finish(false,'La ligne est rangée.');
  this.keyDown=e=>{if([' ','e','E'].includes(e.key)&&!e.repeat){e.preventDefault();this.press();}};
  this.keyUp=e=>{if([' ','e','E'].includes(e.key))this.holding=false;};
  this.blur=()=>this.holding=false;
  window.addEventListener('keydown',this.keyDown);window.addEventListener('keyup',this.keyUp);window.addEventListener('blur',this.blur);
  player.userData.playAction?.('Interact');
 }
 press(){if(this.phase==='bite'){this.phase='reel';this.elapsed=0;this.holding=true;}else if(this.phase==='reel')this.holding=true;else if(this.phase==='wait')this.finish(false,'Trop tôt : le poisson s’est éloigné.');}
 update(dt,time){
  if(this.finished)return;this.elapsed+=dt;this.player.userData.animate(time,false,false,dt);
  const p=this.player.position, cast=this.phase==='cast'?Math.min(1,this.elapsed/.8):1;
  this.bobber.position.copy(p).lerp(this.target,cast);this.bobber.position.y+=Math.sin(cast*Math.PI)*2+Math.sin(time*4)*.025;
  if(this.phase==='bite')this.bobber.position.y-=.12+Math.sin(time*25)*.06;
  this.rod.rotation.z=this.phase==='cast'?Math.sin(cast*Math.PI)*.7:Math.sin(time*2)*.03;this.rod.updateWorldMatrix(true,false);this.tip.set(0,.5,0).applyMatrix4(this.rod.matrixWorld);
  let title='Lancer la ligne…',help='Le flotteur rejoint l’eau.';
  if(this.phase==='cast'&&this.elapsed>.8){this.phase='wait';this.elapsed=0;}
  if(this.phase==='wait'){title='Patience…';help='Attendez la touche avant de ferrer.';if(this.elapsed>this.wait){this.phase='bite';this.elapsed=0;}}
  if(this.phase==='bite'){title='Une touche !';help='Touchez Ferrer ou appuyez sur E !';if(this.elapsed>2.2)return this.finish(false,'Le poisson est reparti.');}
  if(this.phase==='reel'){
   const pull=Math.sin(this.elapsed*1.65)>.35;
   this.tension=Math.max(0,Math.min(1,this.tension+dt*(this.holding?(pull?.37:.24):-.22)));
   this.progress=Math.max(0,this.progress+dt*(this.tension>.27&&this.tension<.78?.11:-.025));
   title=pull?'Il tire ! Relâchez un peu.':'Ramenez doucement…';help='Maintenez pour ramener, relâchez pour détendre. Gardez la tension dans le vert.';
   this.bobber.position.lerp(p,this.progress*.6);this.bobber.position.y=this.target.y+Math.sin(time*4)*.025;
   if(this.tension>=1 || this.elapsed>35)return this.finish(false,'Le poisson a réussi à se libérer.');
   if(this.progress>=1){this.landStart.copy(this.bobber.position);this.phase='land';this.elapsed=0;this.player.userData.playAction?.('Interact');}
  }
  if(this.phase==='land'){title='Une truite ambrée !';help='Vous récupérez votre prise.';this.landEnd.copy(p);this.landEnd.y+=1;const t=Math.min(1,this.elapsed/1.1);this.bobber.position.copy(this.landStart).lerp(this.landEnd,t);this.bobber.position.y+=Math.sin(t*Math.PI)*.7;this.bobber.visible=false;this.catchMesh.visible=true;this.catchMesh.position.copy(this.bobber.position);this.catchMesh.rotation.z=Math.sin(time*20)*.15;if(this.elapsed>1.1)return this.finish(true,'Une truite ambrée rejoint votre sac.');}
  // Build the line AFTER reeling/landing moved the float. Cylinder geometry spans -.5..+.5 before scaling.
  const a=this.line.geometry.attributes.position,b=this.bobber.position;
  a.setXYZ(0,this.tip.x,this.tip.y,this.tip.z);
  a.setXYZ(1,(this.tip.x+b.x)/2,(this.tip.y+b.y)/2-(this.phase==='reel'?.08:.22),(this.tip.z+b.z)/2);
  a.setXYZ(2,b.x,b.y,b.z);a.needsUpdate=true;this.line.geometry.computeBoundingSphere();
  this.panel.querySelector('#fishPhase').textContent=title;this.panel.querySelector('#fishHelp').textContent=help;this.panel.querySelector('#fishNeedle').style.left=(this.tension*97)+'%';this.panel.querySelector('#fishProgress').value=this.progress;
 }
 finish(success,message){if(this.finished)return;this.finished=true;this.dispose();this.onFinish(success,message);}
 dispose(){this.rod.removeFromParent();if(this.hiddenTool)this.hiddenTool.visible=true;this.root.removeFromParent();this.line.geometry.dispose();this.line.material.dispose();this.panel.remove();window.removeEventListener('keydown',this.keyDown);window.removeEventListener('keyup',this.keyUp);window.removeEventListener('blur',this.blur);}
}
