(function(root){
'use strict';
const roster=[
 {name:'기켄즈 하르트',heightUnits:15,height:300,tag:'TOXIC GUARDIAN',color:'#f6c744',speed:220,power:1.25,hp:125,skill:'바이오 펄스',type:'toxic',desc:'묵직한 일격과 독성 탄환으로 전장을 압박합니다.'},
 {name:'베르디슈 아진나차치',heightUnits:8,height:160,tag:'FROST FANG',color:'#84a9ff',speed:330,power:.88,hp:95,skill:'샤크 러시',type:'rush',desc:'빠른 이동과 긴 돌진으로 상대의 빈틈을 파고듭니다.'},
 {name:'신피아 카빗',heightUnits:11,height:220,tag:'ICE ARCHITECT',color:'#6ce5ff',speed:265,power:1,hp:100,skill:'프로스트 샷',type:'ice',desc:'얼음 탄환을 맞혀 상대의 움직임을 늦춥니다.'},
 {name:'잔테 아크',heightUnits:13,height:260,tag:'CRIMSON OATH',color:'#ff5379',speed:280,power:1.12,hp:105,skill:'크림슨 아크',type:'arc',desc:'넓은 범위의 붉은 참격으로 근접전을 지배합니다.'},
 {name:'쿠사가야 츠키토',heightUnits:14,height:280,tag:'SILENT EDGE',color:'#ff915b',speed:350,power:.95,hp:95,skill:'섀도 스텝',type:'dash',desc:'순간적인 고속 돌진으로 거리를 좁히고 베어냅니다.'},
 {name:'플란 베르크',heightUnits:10,height:200,tag:'CLOCKWORK FLAME',color:'#b7df7a',speed:270,power:1.05,hp:100,skill:'타임 브레이크',type:'time',desc:'시간의 파동으로 상대를 늦추고 공격 기회를 만듭니다.'},
 {name:'호코아 그레네이드',heightUnits:9,height:180,tag:'SNOW DETONATOR',color:'#70e2cf',speed:300,power:.95,hp:100,skill:'스노우 버스트',type:'bomb',desc:'강력한 폭발 탄환으로 중거리에서 상대를 견제합니다.'}
];
const golem={...roster[0],name:'아토믹 골렘',height:350,speed:165,power:1.65,type:'fusion',skill:'핵융합 펄스',color:'#ffdc45'};
const slime={...roster[6],name:'니트로 슬라임',height:210,speed:315,power:1.12,type:'nitro',skill:'쿼드루페데즈',color:'#4ff2c5'};
const angel={...roster[2],name:'불릿 엔젤',height:265,speed:245,power:1.15,type:'sniper',skill:'세라프 스나이프',color:'#9be9ff'};
const forms={0:golem,2:angel,6:slime};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
class Match{
 constructor(a,b,mode='cpu',difficulty=1){this.mode=mode;this.difficulty=difficulty;this.wins=[0,0];this.round=0;this.events=[];this.ids=[a,b];this.reset();}
 reset(){this.round++;this.time=60;this.phase='intro';this.wait=2;this.hitstop=0;this.shots=[];this.events=[];this.fighters=this.ids.map((id,i)=>({id,c:roster[id],x:i?870:330,y:0,vy:0,face:i?-1:1,hp:roster[id].hp,meter:35,beast:40,formTime:0,transforming:0,nitroTime:0,nitroOwner:null,cd:0,stun:0,slow:0,poison:0,guard:false,attack:null,combo:0,comboTime:0,ai:0,vx:0,flash:0,aiHold:{},aiState:'거리 탐색',animTime:0,moving:false,landing:0,blocked:false}));}
 transform(f){if(this.phase!=='fight'||!forms[f.id]||f.formTime>0||f.beast<100||f.stun>0||f.attack||f.cd>0||f.y>0||f.hp<=0)return false;f.beast=0;f.formTime=12;f.transforming=.65;f.c=forms[f.id];f.guard=false;f.vx=0;this.events.push({type:'transform',x:f.x,y:544-f.y-175,color:f.c.color,name:f.c.name});return true;}
 attack(f,kind){if(f.cd>0||f.stun>0||f.guard||f.transforming>0)return false;const special=kind==='special';if(special&&f.meter<35)return false;if(special)f.meter-=35;const sniper=special&&f.c.type==='sniper';f.attack={kind,t:0,hit:false,sniper,type:f.c.type,power:f.c.power};f.cd=sniper?1.25:special?.8:kind==='heavy'?.57:.34;this.events.push({type:'swing',kind});return true;}
 hit(f,t,damage,kind,dir,impact='special'){
  if(t.hp<=0)return;
  const blocked=t.guard&&t.y===0&&t.face===-dir;
  const counter=!blocked&&!!t.attack&&t.attack.t<(t.attack.sniper?.45:t.attack.kind==='light'?.09:.16);
  const strength=impact==='light'?1:impact==='heavy'?2:3;
  const dealt=damage*(blocked?.15:counter?1.15:1)*(t.formTime>0&&t.id===0?.8:1);
  t.hp=Math.max(0,t.hp-dealt);
  if(!!forms[f.id]&&!f.formTime)f.beast=clamp(f.beast+(blocked?4:13),0,100);if(!!forms[t.id]&&!t.formTime)t.beast=clamp(t.beast+dealt*.7,0,100);
  t.vx=dir*(blocked?100:strength===1?210:strength===2?430:530);
  f.vx=-dir*(blocked?65:strength===1?25:45);
  t.stun=blocked?.12:(strength===1?.19:strength===2?.32:.40)+(counter?.07:0);
  t.flash=blocked?0:.10;t.blocked=blocked;
  if(!blocked)t.attack=null;
  this.hitstop=blocked?.035:strength===1?.065:strength===2?.105:.135;
  t.meter=clamp(t.meter+7,0,100);f.meter=clamp(f.meter+(blocked?3:9),0,100);
  if(!blocked){f.combo=t.comboOwner===f.id&&f.comboTime>0?f.combo+1:1;t.comboOwner=f.id;f.comboTime=.65;if(kind==='ice')t.slow=2.3;if(kind==='time')t.slow=2.3;if(kind==='toxic')t.poison=2.4;if(kind==='nitro'&&impact==='special'){t.nitroTime=1.1;t.nitroOwner=this.fighters.indexOf(f);this.events.push({type:'inject',x:t.x,y:544-t.y-t.c.height*.55,color:slime.color});}}
  this.events.push({type:blocked?'block':'hit',x:t.x-dir*25,y:544-t.y-t.c.height*.55,color:blocked?'#b8efff':f.c.color,combo:f.combo,damage:Math.round(dealt),strength,dir,counter});
 }
 aiInput(f,t,dt){
  // Decisions are sampled, not a frame-perfect read of the player's inputs.
  f.ai-=dt;
  if(f.ai>0)return {...(f.aiHold||{})};
  f.ai=this.difficulty?.17+Math.random()*.08:.30+Math.random()*.16;
  const dx=t.x-f.x,d=Math.abs(dx),toward=Math.sign(dx),aligned=Math.abs(t.y-f.y)<80;
  const input={},move=dir=>{input.left=dir<0;input.right=dir>0;};
  const retreat=()=>{const next=f.x-toward*65;if(next>80&&next<1120)move(-toward);else input.guard=true;};
  const ranged=['toxic','ice','time','bomb','fusion','sniper'].includes(f.c.type);
  const ready=f.meter>=35;
  const end=t.attack?(t.attack.sniper?.55:t.attack.kind==='light'?.19:t.attack.kind==='heavy'?.29:.35):0;
  const reach=t.attack?(t.attack.sniper?1000:t.attack.kind==='light'?125:t.attack.kind==='heavy'?165:['arc','nitro'].includes(t.c.type)?245:210):0;
  const danger=t.attack&&t.attack.t<end&&d<reach+28&&aligned;
  const incoming=this.shots.some(s=>this.fighters[s.owner]!==f&&(f.x-s.x)*s.dir>0&&Math.abs(f.x-s.x)<s.speed*.38&&Math.abs(f.y+100-s.y)<110);
  if(f.stun>0){f.aiState='피격';}
  else if((danger||incoming)&&this.difficulty){
   f.aiState='방어';if(incoming||d<reach-15)input.guard=true;else retreat();
  }else if(f.attack||f.cd>.04){
   f.aiState='회복';if(!f.attack&&d<190)retreat();
  }else if(!aligned){
   f.aiState='대공 거리 확보';if(d<185)retreat();
  }else{
   const punish=t.attack&&t.attack.t>=end;
   const roll=Math.random();
   if(punish&&d<153){input[d<110?'light':'heavy']=true;f.aiState='빈틈 반격';}
   else if(d<90){if(roll<.45){input.light=true;f.aiState='근접 견제';}else{retreat();f.aiState='거리 벌리기';}}
   else if(ready&&ranged&&d>=245&&d<=(f.c.type==='sniper'?950:570)&&roll<.65){input.special=true;f.aiState='원거리 견제';}
   else if(ready&&!ranged&&d>175&&d<(['arc','nitro'].includes(f.c.type)?230:300)&&roll<.38){input.special=true;f.aiState='진입 공격';}
   else if(d<153&&roll<.65){input[d<112?'light':'heavy']=true;f.aiState='사거리 견제';}
   else{
    const ideal=ranged&&ready?(f.c.type==='sniper'?500:330):145;
    if(d>ideal+35){move(toward);f.aiState='접근';}
    else if(d<ideal-30){retreat();f.aiState='거리 벌리기';}
    else{f.aiState='거리 유지';if(roll<.15)retreat();}
   }
  }
  // Movement/guard persist between decisions; attacks are single pulses.
  f.aiHold={left:!!input.left,right:!!input.right,guard:!!input.guard};
  if(forms[f.id]&&f.beast>=100&&!f.formTime&&d>200)input.transform=true;
  return input;
 }
 step(dt,inputs=[{},{}]){dt=Math.min(dt,.035);if(this.phase==='intro'){this.wait-=dt;if(this.wait<=0)this.phase='fight';return;}if(this.phase!=='fight')return;if(this.hitstop>0){this.hitstop=Math.max(0,this.hitstop-dt);return;}this.time=Math.max(0,this.time-dt);
 this.fighters.forEach((f,i)=>{const t=this.fighters[1-i],input=this.mode==='cpu'&&i===1?this.aiInput(f,t,dt):(inputs[i]||{});const oldX=f.x,oldY=f.y;f.animTime+=dt;
 if(f.formTime>0){f.formTime=Math.max(0,f.formTime-dt);if(!f.formTime){f.c=roster[f.id];f.transforming=0;this.events.push({type:'revert',x:f.x,y:544-f.y-150,color:'#c2e7ff'});}}else if(forms[f.id])f.beast=clamp(f.beast+dt*3,0,100);
 if(f.nitroTime>0){f.nitroTime=Math.max(0,f.nitroTime-dt);if(!f.nitroTime&&f.hp>0){const owner=this.fighters[f.nitroOwner];this.hit(owner,f,18,'detonation',f.x>=owner.x?1:-1,'special');this.events.push({type:'detonate',x:f.x,y:544-f.y-f.c.height*.55,color:slime.color});f.nitroOwner=null;}}
 f.transforming=Math.max(0,f.transforming-dt);f.flash=Math.max(0,f.flash-dt);f.x+=f.vx*dt;f.vx*=Math.exp(-11*dt);f.landing=Math.max(0,f.landing-dt);f.cd=Math.max(0,f.cd-dt);f.stun=Math.max(0,f.stun-dt);f.slow=Math.max(0,f.slow-dt);f.comboTime-=dt;f.meter=clamp(f.meter+dt*2,0,100);if(f.poison>0){f.poison-=dt;f.hp=Math.max(1,f.hp-dt*2);}f.face=t.x>=f.x?1:-1;f.guard=!!input.guard&&f.y===0&&!f.attack&&f.stun===0;
 if(input.transform)this.transform(f);
 if(!f.stun&&!f.attack&&!f.transforming){if(!f.guard)f.x+=((input.right?1:0)-(input.left?1:0))*f.c.speed*(f.slow>0?.5:1)*dt;if(input.jump&&f.y===0&&!f.guard)f.vy=630;if(input.special)this.attack(f,'special');else if(input.heavy)this.attack(f,'heavy');else if(input.light)this.attack(f,'light');}
 f.y=Math.max(0,f.y+f.vy*dt);f.vy-=1650*dt;if(f.y===0){f.vy=0;if(oldY>0)f.landing=.09;}
 if(f.attack){const a=f.attack;a.t+=dt;const special=a.kind==='special',type=a.type||f.c.type;const rush=special&&(type==='rush'||type==='dash');if(rush&&a.t<.3)f.x+=f.face*700*dt;
 if(!a.hit&&a.t>(a.sniper?.45:a.kind==='light'?.09:.16)&&a.t<(a.sniper?.55:a.kind==='light'?.19:a.kind==='heavy'?.29:.35)){const projectile=special&&['toxic','ice','bomb','time','fusion','sniper'].includes(type);if(projectile){this.shots.push({owner:i,x:f.x+f.face*(a.sniper?105:50),y:f.y+(a.sniper?f.c.height*.55:100),dir:f.face,life:2,speed:type==='sniper'?1600:type==='bomb'?410:540,type,color:f.c.color,damage:(type==='sniper'?32:type==='fusion'?25:type==='bomb'?24:18)*a.power});if(a.sniper)this.events.push({type:'snipe',x:f.x,y:544-f.y-f.c.height*.55,color:f.c.color,dir:f.face});a.hit=true;}else{const range=special?(type==='arc'||type==='nitro'?245:180):a.kind==='heavy'?165:125;if(Math.abs(t.x-f.x)<range&&Math.abs(t.y-f.y)<105&&(t.x-f.x)*f.face>=0){this.hit(f,t,(special?23:a.kind==='heavy'?15:8)*a.power,type,f.face,a.kind);a.hit=true;}}}
 if(a.t>(a.sniper?.95:special?.55:a.kind==='heavy'?.48:.32))f.attack=null;}
 f.x=clamp(f.x,65,1135);f.moving=Math.abs(f.x-oldX)>.1&&!f.attack&&!f.stun;
 });
 const [a,b]=this.fighters;if(Math.abs(a.x-b.x)<72&&Math.abs(a.y-b.y)<120){const sign=a.x<=b.x?1:-1;const push=(72-Math.abs(a.x-b.x))/2;a.x=clamp(a.x-push*sign,65,1135);b.x=clamp(b.x+push*sign,65,1135);}
 this.shots=this.shots.filter(s=>{const previousX=s.x;s.x+=s.dir*s.speed*dt;s.life-=dt;const t=this.fighters[1-s.owner];if(t.x>=Math.min(previousX,s.x)-52&&t.x<=Math.max(previousX,s.x)+52&&Math.abs(t.y+100-s.y)<100){this.hit(this.fighters[s.owner],t,s.damage,s.type,s.dir);return false;}return s.life>0&&s.x>0&&s.x<1200;});
 if(a.hp<=0||b.hp<=0||this.time<=0){const va=a.hp/a.c.hp,vb=b.hp/b.c.hp;this.winner=Math.abs(va-vb)<.00001?-1:va>vb?0:1;if(this.winner>=0)this.wins[this.winner]++;this.phase=this.wins.some(w=>w>=2)?'finished':'round';this.events.push({type:'finish'});}
 }
}
const api={roster,golem,slime,angel,forms,Match};if(typeof module!=='undefined')module.exports=api;root.WinterFight=api;
})(typeof window!=='undefined'?window:globalThis);
