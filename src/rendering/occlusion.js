import { T, foliageFocus, foliageCamera, foliageCutaway } from './art.js';
export const cutawayScreen={value:new T.Vector3(0,0,1)};
const projectedFocus=new T.Vector3();
export function updateCutawayScreen(camera,renderer,focus){
 projectedFocus.copy(focus).project(camera);
 const size=renderer.getDrawingBufferSize(screenSize);
 const radius=Math.min(size.y*.3,Math.max(20,size.y*1.0/(Math.max(1,camera.position.distanceTo(focus))*Math.tan(camera.fov*Math.PI/360))));
 cutawayScreen.value.set((projectedFocus.x*.5+.5)*size.x,(projectedFocus.y*.5+.5)*size.y,radius*radius);
}
const screenSize=new T.Vector2();
// Opaque dither cutaway: no sorting, no transparent draw pass, shared uniforms.
export function obstacleCutaway(material) {
 if(material.userData.obstacleCutaway || material.userData.cutawayExcluded)return;
 material.userData.obstacleCutaway=true;
 const old=material.onBeforeCompile, key=material.customProgramCacheKey.bind(material);
 material.onBeforeCompile=shader=>{
  old.call(material,shader);
  shader.uniforms.cutawayScreen=cutawayScreen;
  shader.uniforms.obstacleFocus=foliageFocus;shader.uniforms.obstacleCamera=foliageCamera;shader.uniforms.obstacleCutaway=foliageCutaway;
  shader.vertexShader='varying vec3 obstacleWorld;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
vec4 obstacleVertex=vec4(transformed,1.);
#ifdef USE_INSTANCING
obstacleVertex=instanceMatrix*obstacleVertex;
#endif
obstacleWorld=(modelMatrix*obstacleVertex).xyz;`);
  shader.fragmentShader='uniform vec3 cutawayScreen;varying vec3 obstacleWorld;uniform vec3 obstacleFocus;uniform vec3 obstacleCamera;uniform float obstacleCutaway;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <dithering_fragment>',`#include <dithering_fragment>
vec2 screenDelta=gl_FragCoord.xy-cutawayScreen.xy;
float screenRadius=dot(screenDelta,screenDelta);
if(obstacleCutaway>.5 && screenRadius<cutawayScreen.z && obstacleWorld.y>obstacleFocus.y-.75){
 vec3 ray=obstacleCamera-obstacleFocus;
 float a=dot(obstacleWorld-obstacleFocus,ray)/max(dot(ray,ray),.01);
 if(a>.055 && a<1.05){
  float keep=smoothstep(cutawayScreen.z*.12,cutawayScreen.z,screenRadius);
  float noise=fract(dot(mod(floor(gl_FragCoord.xy),4.),vec2(.25,.0625)));
  if(noise>keep)discard;
 }
}`);
 };
 material.customProgramCacheKey=()=>key()+'-obstacle-v1';material.needsUpdate=true;
}
export function prepareOccluders(root){const seen=new Set();root.traverse(o=>{if(o.isMesh){for(const m of Array.isArray(o.material)?o.material:[o.material])if(m?.isMeshStandardMaterial&&!seen.has(m)){seen.add(m);obstacleCutaway(m);}}});}
