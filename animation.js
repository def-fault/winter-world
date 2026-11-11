(function(root){
'use strict';
// Indices refer to actual, independently drawn poses in each 4 x 4 sheet.
const cycles={idle:[0,1,0,1],walk:[2,0,3,1],guard:[11],jump:[12,13],hurt:[14],ko:[15]};
function pose(f){
 if(f.hp<=0)return 15;
 if(f.transforming>0)return 8;
 if(f.stun>0)return f.blocked?11:14;
 if(f.attack){const {kind,t}=f.attack;
  if(f.attack.sniper)return t<.45?8:t<.55?9:10;
  if(kind==='light')return t<.09?4:t<.19?5:4;
  if(kind==='heavy')return t<.16?6:t<.29?7:6;
  return t<.16?8:t<.35?9:10;
 }
 if(f.guard)return 11;
 if(f.y>0)return f.vy>520?12:13;
 if(f.landing>0)return 12;
 const cycle=f.moving?cycles.walk:cycles.idle;
 return cycle[Math.floor((f.animTime||0)*(f.moving?10:3))%cycle.length];
}
function draw(ctx,image,atlas,index,x,foot,height,face=1){
 const frame=atlas.frames[index],scale=height/atlas.standingHeight;
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(x),Math.round(foot));ctx.scale(face,1);
 ctx.drawImage(image,frame.x,frame.y,frame.w,frame.h,Math.round(-frame.pivotX*scale),Math.round(-frame.pivotY*scale),Math.round(frame.w*scale),Math.round(frame.h*scale));ctx.restore();
}
const api={cycles,pose,draw};root.FighterAnimation=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
