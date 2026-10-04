import {T} from './art.js';
export function flowingFountain(scene,x,y,z){
 const root=new T.Group();root.position.set(x,y,z);scene.add(root);
 const uniforms={time:{value:0}};
 const curtain=new T.Mesh(new T.CylinderGeometry(1.28,1.78,1.48,48,1,true),new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:T.DoubleSide,vertexShader:'varying vec2 uvWater;void main(){uvWater=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec2 uvWater;uniform float time;void main(){float strands=pow(.5+.5*sin(uvWater.x*240.+sin(uvWater.y*12.-time*7.)),5.);float drops=pow(.5+.5*sin(uvWater.y*48.+time*14.+uvWater.x*23.),9.);gl_FragColor=vec4(mix(vec3(.23,.68,.75),vec3(.83,.98,1.),strands*.65+drops*.25),.24+strands*.47);}`}));
 curtain.position.y=1.1;root.add(curtain);
 const waterMat=new T.MeshStandardMaterial({color:'#73cbd2',roughness:.23,metalness:.08});waterMat.userData.cutawayExcluded=true;
 const top=new T.Mesh(new T.CylinderGeometry(1.25,1.25,.025,40),waterMat);top.position.y=1.915;root.add(top);
 const rings=[];
 for(let i=0;i<5;i++){const m=new T.Mesh(new T.RingGeometry(.93,1,48),new T.MeshBasicMaterial({color:'#d4f7ef',transparent:true,opacity:.4,depthWrite:false,side:T.DoubleSide}));m.rotation.x=-Math.PI/2;m.position.y=.336+i*.001;root.add(m);rings.push(m);}
 const drops=new T.InstancedMesh(new T.SphereGeometry(.025,5,4),new T.MeshBasicMaterial({color:'#d1f8ff'}),80);root.add(drops);const dummy=new T.Object3D();
 return {root,update(t){uniforms.time.value=t;for(let i=0;i<rings.length;i++){let p=(t*.45+i/5)%1;const r=1.5+p*.95;rings[i].scale.setScalar(r);rings[i].material.opacity=(1-p)*.38;}for(let i=0;i<80;i++){const a=i*2.399,p=(t*.9+i/80)%1,r=1.3+p*.55;dummy.position.set(Math.sin(a)*r,1.84-p*1.5,Math.cos(a)*r);dummy.scale.set(1,2.5,1);dummy.updateMatrix();drops.setMatrixAt(i,dummy.matrix);}drops.instanceMatrix.needsUpdate=true;}};
}
