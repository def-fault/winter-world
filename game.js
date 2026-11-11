'use strict';
const {roster,forms,Match}=WinterFight,$=id=>document.getElementById(id),canvas=$('canvas'),ctx=canvas.getContext('2d');
let chosen=[4,3],picking=0,match=null,paused=false,last=0,fx=[],shake=0,sound=true,audio=null,clock=0;
const keys=new Set(),pressed=new Set(),images=roster.map((_,i)=>{const im=new Image();im.src=`assets/sprites/fighter-${i}.png`;return im;});
const golemImage=new Image();golemImage.src='assets/sprites/atomic-golem.png';
const slimeImage=new Image();slimeImage.src='assets/sprites/nitro-slime.png';
const angelImage=new Image();angelImage.src='assets/sprites/bullet-angel.png';
const formImages={0:golemImage,2:angelImage,6:slimeImage},formAtlases={0:GOLEM_ATLAS,2:ANGEL_ATLAS,6:SLIME_ATLAS};
Promise.all([...images,...Object.values(formImages)].map(im=>new Promise((resolve,reject)=>{if(im.complete&&im.naturalWidth)resolve();else{im.onload=resolve;im.onerror=reject;}}))).then(()=>{$('start').disabled=false;$('start').textContent='대전 시작  →';}).catch(()=>{$('start').textContent='이미지 로드 실패 · assets 폴더를 확인하세요';});
function selectUI(){
 $('roster').innerHTML=roster.map((c,i)=>`<button class="card ${chosen[0]===i?'selected':''} ${chosen[1]===i?'enemy':''}" style="--c:${c.color}" aria-label="${c.name} 선택" aria-pressed="${chosen[picking]===i}" data-id="${i}"><span class="number">0${i+1}</span>${chosen.includes(i)?`<span class="badge">${chosen[0]===i?'P1':''}${chosen[0]===i&&chosen[1]===i?' / ':''}${chosen[1]===i?'P2':''}</span>`:''}<img src="assets/fighter-${i}.png?v=49f7f1b3171d" alt=""><span class="label"><small>${c.tag}</small>${c.name}</span></button>`).join('');
 $('roster').querySelectorAll('button').forEach(b=>b.onclick=()=>{chosen[picking]=Number(b.dataset.id);selectUI();});
 const c=roster[chosen[picking]];$('profile-tag').textContent=c.tag+' / '+c.skill;$('profile-name').textContent=c.name;$('profile-desc').textContent=c.desc+(chosen[picking]===0?' 변신: 아토믹 골렘 · I키 · 12초간 공격 강화 / 받는 피해 감소.':chosen[picking]===2?' 변신: 불릿 엔젤 · I키 · 조준 후 고속 저격탄을 발사합니다.':chosen[picking]===6?' 변신: 니트로 슬라임 · I키 · 쿼드루페데즈 적중 후 지연 폭발.':'');
 $('stats').innerHTML=[['공격',c.power/1.3],['속도',c.speed/360],['체력',c.hp/130]].map(([n,v])=>`<span>${n}<i><b style="width:${v*100}%"></b></i></span>`).join('');
 $('versus').textContent=`P1 ${roster[chosen[0]].name}  /  P2 ${roster[chosen[1]].name}`;
 $('pick-label').textContent=picking?'상대 캐릭터 선택':'플레이어 캐릭터 선택';$('pick-toggle').textContent=picking?'← 플레이어 선택하기':'상대 선택하기 →';
}
$('pick-toggle').onclick=()=>{picking=1-picking;selectUI();};$('mode').onchange=()=>{$('difficulty-label').style.visibility=$('mode').value==='cpu'?'visible':'hidden';};
function tone(freq,duration=.08,type='sine',volume=.035){if(!sound)return;try{audio ||=new (window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(30,freq*.4),audio.currentTime+duration);g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}catch{}}
$('sound').onclick=()=>{sound=!sound;$('sound').textContent=`사운드 ${sound?'ON':'OFF'}`;tone(600);};
function start(){if($('mode').value==='online')return;document.querySelector('.controls>div:nth-child(2)').hidden=false;document.querySelector('.controls>div:first-child>b').textContent='PLAYER 1';tone(180,.05);match=new Match(...chosen,$('mode').value,Number($('difficulty').value));paused=false;fx=[];keys.clear();pressed.clear();$('select').hidden=true;$('game').hidden=false;$('overlay').hidden=true;$('p2-label').textContent=match.mode==='cpu'?'CPU OPPONENT':'PLAYER 2';tone(700,.2);}
$('start').onclick=start;
function back(){if(online.active)leaveOnline();match=null;keys.clear();pressed.clear();$('game').hidden=true;$('select').hidden=false;$('overlay').hidden=true;selectUI();}
$('back').onclick=back;$('return').onclick=back;
function overlay(tag,title,desc,label){$('overlay').hidden=false;$('result-tag').textContent=tag;$('result-title').textContent=title;$('result-desc').textContent=desc;$('continue').textContent=label;}
function pause(){if(online.active)return;if(!match||!['intro','fight'].includes(match.phase))return;paused=!paused;keys.clear();pressed.clear();if(paused)overlay('TIME OUT','잠시 쉬어가기','준비가 되면 전장으로 돌아오세요.','계속하기');else $('overlay').hidden=true;}
$('pause').onclick=pause;$('continue').onclick=()=>{if(online.active){online.send({type:'ready'});$('continue').disabled=true;$('continue').textContent='상대 준비를 기다리는 중…';return;}if(paused){pause();return;}if(match.phase==='finished')start();else{match.reset();fx=[];$('overlay').hidden=true;}};
const gameKeys=['KeyA','KeyD','KeyW','KeyS','KeyJ','KeyK','KeyL','KeyI','Digit0','Numpad0','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Digit1','Digit2','Digit3','Numpad1','Numpad2','Numpad3'];
window.addEventListener('keydown',e=>{if(!match)return;if(gameKeys.includes(e.code)||e.code==='Escape')e.preventDefault();if(e.code==='Escape'&&!e.repeat){pause();return;}if(!keys.has(e.code))pressed.add(e.code);keys.add(e.code);});window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();pressed.clear();if(online.active)online.input({},true);if(match&&!paused&&['intro','fight'].includes(match.phase))pause();});
function inputs(){return[{left:keys.has('KeyA'),right:keys.has('KeyD'),jump:pressed.has('KeyW'),guard:keys.has('KeyS'),light:pressed.has('KeyJ'),heavy:pressed.has('KeyK'),transform:pressed.has('KeyI'),special:pressed.has('KeyL')},{left:keys.has('ArrowLeft'),right:keys.has('ArrowRight'),jump:pressed.has('ArrowUp'),guard:keys.has('ArrowDown'),light:pressed.has('Digit1')||pressed.has('Numpad1'),heavy:pressed.has('Digit2')||pressed.has('Numpad2'),transform:pressed.has('Digit0')||pressed.has('Numpad0'),special:pressed.has('Digit3')||pressed.has('Numpad3')}];}
function text(t,x,y,size=16,color='#fff',align='left'){ctx.fillStyle=color;ctx.font=`${size>=30?'800':'600'} ${size}px "Malgun Gothic",sans-serif`;ctx.textAlign=align;ctx.fillText(t,x,y);}
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
function line(x1,y1,x2,y2,c,w=1){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
function background(){const g=ctx.createLinearGradient(0,0,0,650);g.addColorStop(0,'#0c1a30');g.addColorStop(.65,'#527388');g.addColorStop(1,'#112638');ctx.fillStyle=g;ctx.fillRect(0,0,1200,650);
 ctx.save();ctx.globalAlpha=.4;const aurora=ctx.createLinearGradient(0,90,1200,300);aurora.addColorStop(0,'#41d7bc00');aurora.addColorStop(.5,'#7ddacb');aurora.addColorStop(1,'#527bb100');ctx.fillStyle=aurora;ctx.beginPath();ctx.moveTo(0,150);ctx.bezierCurveTo(400,330,650,-50,1200,150);ctx.lineTo(1200,230);ctx.bezierCurveTo(650,50,400,400,0,200);ctx.fill();ctx.restore();
 ctx.fillStyle='#b9d6e0';ctx.beginPath();ctx.arc(970,148,43,0,Math.PI*2);ctx.fill();
 for(let layer=0;layer<2;layer++){ctx.fillStyle=layer?'#213c50':'#456477';ctx.beginPath();ctx.moveTo(0,500);for(let x=0;x<=1300;x+=100)ctx.lineTo(x,270+Math.sin(x*.018+layer*2)*65+layer*70);ctx.lineTo(1200,550);ctx.closePath();ctx.fill();}
 rect(0,398,1200,150,'#172d40');for(let x=25;x<1200;x+=90){rect(x,414,60,74,'#29465b');rect(x+4,418,52,4,'#789bab');line(x+30,420,x+30,488,'#11283a',3);}rect(0,392,1200,7,'#9ab7c3');rect(0,526,1200,16,'#b0cbd6');rect(0,542,1200,108,'#233e50');for(let x=-600;x<1800;x+=130)line(600+(x-600)*.7,542,x,650,'#496273');line(0,585,1200,585,'#4a6678');line(0,635,1200,635,'#4a6678');
 for(const x of [100,1100]){rect(x,235,5,295,'#0c2031');rect(x-26,232,57,7,'#acc7d0');const glow=ctx.createRadialGradient(x,248,1,x,248,100);glow.addColorStop(0,'#c5efff55');glow.addColorStop(1,'#c5efff00');ctx.fillStyle=glow;ctx.fillRect(x-100,148,200,200);rect(x-20,241,44,4,'#dbf7ff');}
 text('WINTER WORLD  /  TERMINAL 07',600,452,13,'#66899e','center');
 for(let i=0;i<65;i++){const x=(i*137.7+clock*(15+i%7))%1200,y=(i*63+clock*(18+i%13))%650;ctx.fillStyle='#d1eaf0'+(i%3?'66':'aa');ctx.beginPath();ctx.arc(x,y,i%3===0?2:1,0,7);ctx.fill();}
}
function fighter(f,i){const im=f.formTime>0?formImages[f.id]:images[f.id],h=f.c.height;const foot=544-f.y;
 ctx.fillStyle='#04101d66';ctx.beginPath();ctx.ellipse(f.x,549,Math.max(20,h*.19-f.y*.08),10,0,0,7);ctx.fill();
 const pose=FighterAnimation.pose(f);
 ctx.save();if(f.flash>0)ctx.filter="brightness(2.3) saturate(.35)";FighterAnimation.draw(ctx,im,(f.formTime>0?formAtlases[f.id]:SPRITE_ATLASES[f.id]),pose,f.x,foot,h,f.face);ctx.restore();
 if(f.formTime>0&&f.id===0){ctx.save();ctx.globalAlpha=.45+.2*Math.sin(clock*10);ctx.strokeStyle='#ffe670';ctx.lineWidth=f.transforming?8:2;ctx.beginPath();ctx.ellipse(f.x,foot-h*.53,45+Math.sin(clock*7)*6,55,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
 if(f.guard){ctx.strokeStyle='#a6eeff';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(f.x+f.face*35,foot-h*.45,h*.18,h*.42,0,-Math.PI/2,Math.PI/2);ctx.stroke();text('GUARD',f.x,foot-h-12,11,'#a6eeff','center');}
 if(f.attack?.sniper&&f.attack.t<.45){ctx.save();ctx.globalAlpha=.25+f.attack.t;line(f.x+f.face*105,foot-h*.55,f.x+f.face*1100,foot-h*.55,'#b4f5ff',1);ctx.restore();text('조준',f.x,foot-h-20,14,'#b4f5ff','center');}
 if(f.attack&&!f.attack.sniper&&f.attack.t>=.09&&f.attack.t<.30){const a=f.attack;ctx.save();ctx.translate(f.x+f.face*45,foot-h*.5);ctx.scale(f.face,1);ctx.strokeStyle=f.c.color;ctx.shadowColor=f.c.color;ctx.shadowBlur=23;ctx.lineWidth=a.kind==='light'?6:12;ctx.globalAlpha=Math.max(0,1-a.t*2);ctx.beginPath();ctx.arc(0,0,a.kind==='special'?130:a.kind==='heavy'?95:62,-1.1+a.t*3,1.1+a.t*3);ctx.stroke();ctx.restore();if(a.kind==='special')text(f.c.skill,f.x,foot-h-30,18,f.c.color,'center');}
 if(f.nitroTime>0)text('주입 · '+f.nitroTime.toFixed(1)+'s',f.x,foot-h-30,15,'#4ff2c5','center');
 if(f.slow>0)text('SLOW',f.x,foot-h-9,12,'#7cdeff','center');if(f.poison>0)text('POISON',f.x,foot-h-25,12,'#dbec69','center');
 if(f.comboTime>0&&f.combo>1)text(`${f.combo} HITS`,i?1040:160,195,28,f.c.color,'center');
}
function hud(){const [a,b]=match.fighters;rect(0,0,1200,115,'#07111cd9');[a,b].forEach((f,i)=>{const x=i?700:45;const width=455;rect(x,47,width,20,'#344454');const health=width*f.hp/f.c.hp;rect(i?x+width-health:x,47,health,20,f.hp/f.c.hp<.25?'#ff617d':f.c.color);text(f.c.name,i?1155:45,32,19,'#f0f4f7',i?'right':'left');text(i?(match.mode==='cpu'?'CPU':online.active?(online.slot===1?'YOU · P2':'OPPONENT · P2'):'PLAYER 2'):online.active?(online.slot===0?'YOU · P1':'OPPONENT · P1'):'PLAYER 1',i?1155:45,94,10,'#8da5b7',i?'right':'left');rect(i?900:45,104,255,5,'#344454');rect(i?1155-255*f.meter/100:45,104,255*f.meter/100,5,f.c.color);text(`SKILL ${Math.floor(f.meter)}${f.meter>=35?' · READY':''}`,i?1155:45,127,10,f.meter>=35?f.c.color:'#8195a6',i?'right':'left');if(forms[f.id]){const bx=i?900:45;rect(bx,141,255,7,'#344454');rect(bx,141,255*(f.formTime>0?f.formTime/12:f.beast/100),7,'#ffdc45');text(f.formTime>0?f.c.name+' · '+f.formTime.toFixed(1)+'s':f.beast>=100?'변신 준비 · '+(i&&!online.active?'0':'I'):'변신 '+Math.floor(f.beast)+'%',i?1155:45,166,12,'#ffe274',i?'right':'left');}for(let j=0;j<2;j++){ctx.fillStyle=match.wins[i]>j?f.c.color:'#344454';ctx.beginPath();ctx.arc(i?730+j*22:470-j*22,87,5,0,7);ctx.fill();}});text(String(Math.ceil(match.time)).padStart(2,'0'),600,65,45,'#eaf5fb','center');text(`ROUND ${match.round}`,600,92,10,'#9eb7ca','center');}
function draw(dt){
 ctx.save();if(shake>0){ctx.translate(Math.sin(clock*160)*shake*.65,Math.cos(clock*130)*shake*.35);shake=Math.max(0,shake-dt*75);}background();
 match.fighters.forEach(fighter);
 for(const s of match.shots){ctx.save();ctx.shadowBlur=25;ctx.shadowColor=s.color;ctx.fillStyle=s.color;ctx.beginPath();ctx.ellipse(s.x,544-s.y,s.type==='sniper'?48:s.type==='bomb'?27:33,s.type==='sniper'?3:s.type==='bomb'?27:14,0,0,7);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(s.x+s.dir*8,544-s.y,7,0,7);ctx.fill();ctx.restore();}
 fx=fx.filter(e=>{
  e.life-=dt;if(e.life<=0)return false;const age=.45-e.life,strong=e.strength||1;
  ctx.save();ctx.translate(e.x,e.y);ctx.globalAlpha=Math.min(1,e.life/.20);
  if(age<.12){ctx.save();ctx.scale(e.dir||1,1);ctx.fillStyle=age<.055?'#fff8d9':e.color;ctx.beginPath();const radius=(e.type==='block'?20:30+strong*9)*(1+age*3);for(let n=0;n<16;n++){const angle=n*Math.PI/8,r=n%2?radius*.22:radius;const x=Math.cos(angle)*r*1.3,y=Math.sin(angle)*r;n?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.fill();ctx.restore();}
  for(let n=0;n<10+strong*3;n++){const angle=n*2.399,r=age*(100+strong*45),length=(1-age/.45)*(12+strong*4);line(Math.cos(angle)*r,Math.sin(angle)*r,Math.cos(angle)*(r+length),Math.sin(angle)*(r+length),n%3?'#fff1ba':e.color,n%3?2:4);}
  if(e.counter)text('COUNTER',0,-65-age*55,19,'#ffe493','center');
  text(e.type==='transform'?e.name:e.type==='inject'?'쿼드루페데즈 · 주입':e.type==='detonate'?'NITRO BURST':e.type==='revert'?'변신 해제':e.type==='block'?'GUARD':`−${e.damage}`,0,-30-age*65,18,e.color,'center');ctx.restore();return true;
 });ctx.restore();hud();
 if(match.phase==='intro'){text(match.wait>1?`ROUND ${match.round}`:'FIGHT',600,300,72,'#f0ffff','center');text('FROSTBOUND',600,338,13,'#b0eadd','center');}
}
function impactSound(e){
 if(!sound)return;
 try{
  audio ||=new(window.AudioContext||window.webkitAudioContext)();audio.resume();
  const blocked=e.type==='block',strength=e.strength||1,duration=blocked?.065:.09+strength*.025,now=audio.currentTime;
  const buffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*duration),audio.sampleRate),samples=buffer.getChannelData(0);
  for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*Math.pow(1-i/samples.length,3);
  const noise=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();noise.buffer=buffer;filter.type=blocked?'highpass':'lowpass';filter.frequency.value=blocked?1700:1300+strength*500;gain.gain.value=blocked?.07:.12+strength*.035;noise.connect(filter);filter.connect(gain);gain.connect(audio.destination);noise.start();
  tone(blocked?850:180-strength*22,duration,blocked?'triangle':'sine',blocked?.035:.10+strength*.025);
 }catch{}
}
function frame(now){const dt=Math.min((now-last)/1000||0,.035);last=now;if(match){if(!paused){clock+=dt;if(online.active){online.input(inputs()[0]);pressed.clear();}else{match.step(dt,inputs());if(match.hitstop<=0)pressed.clear();}for(const e of match.events){if(e.type==='snipe'){shake=10;tone(120,.18,'sawtooth',.08);}if(['transform','revert','inject','detonate'].includes(e.type)){shake=e.type==='transform'?20:7;tone(e.type==='transform'?85:220,.6,'sawtooth',.06);fx.push({...e,life:.45,strength:4,damage:0});}if(e.type==='hit'||e.type==='block'){fx.push({...e,life:.45});shake=e.type==='hit'?(e.strength===1?5:e.strength===2?12:16):2;impactSound(e);}if(e.type==='swing')tone(250,.045,'sine',.012);if(e.type==='finish'){$('continue').disabled=false;const win=match.winner;overlay(match.phase==='finished'?'MATCH COMPLETE':'ROUND COMPLETE',win<0?'무승부':`${match.fighters[win].c.name} 승리`,`${match.wins[0]} : ${match.wins[1]} · ${win<0?'다시 겨뤄보세요.':'설원에 새로운 승리가 새겨졌습니다.'}`,match.phase==='finished'?'다시 대전':'다음 라운드');tone(660,.4);}}match.events=[];}draw(paused?0:dt);}requestAnimationFrame(frame);}
selectUI();setupOnline();requestAnimationFrame(frame);

function onlineMode(){const net=$('mode').value==='online';$('online-panel').hidden=!net;$('start').hidden=net;$('difficulty-label').style.visibility=$('mode').value==='cpu'?'visible':'hidden';$('pick-toggle').hidden=net;$('versus').hidden=net;if(net){picking=0;selectUI();}}
function onlineLobby(message){match=null;paused=false;keys.clear();pressed.clear();$('game').hidden=true;$('select').hidden=false;$('overlay').hidden=true;$('pause').disabled=false;$('continue').disabled=false;$('net-latency').textContent='';if(message)$('net-status').textContent=message;}
function leaveOnline(){online.disconnect();onlineLobby('방에서 나왔습니다.');$('net-room').hidden=true;$('net-entry').hidden=false;$('mode').disabled=false;$('net-create').disabled=false;$('net-join').disabled=false;$('roster').querySelectorAll('button').forEach(b=>b.disabled=false);}
function setupOnline(){
 const status=t=>$('net-status').textContent=t;
 online.hooks={status,busy:v=>{$('net-create').disabled=v;$('net-join').disabled=v;$('mode').disabled=v||online.active;},
  joined:m=>{$('net-room').hidden=false;$('net-entry').hidden=true;$('net-room-code').textContent=`ROOM ${m.code}`;$('mode').disabled=true;$('roster').querySelectorAll('button').forEach(b=>b.disabled=true);status(`당신은 P${m.slot+1}입니다. 친구가 참가하면 시작합니다.`);},
  room:m=>{$('net-players').textContent=m.players.map((p,i)=>p?`P${i+1} ${roster[p.character].name} · ${p.ready?'준비 완료':'준비 중'}`:`P${i+1} 참가자 대기`).join(' / ');$('net-ready').disabled=!!m.players[online.slot]?.ready||m.running;$('net-ready').hidden=online===peerOnline;},
  start:()=>{document.querySelector('.controls>div:nth-child(2)').hidden=true;document.querySelector('.controls>div:first-child>b').textContent=`내 캐릭터 · P${online.slot+1}`;$('net-latency').textContent=`ROOM ${online.code} · YOU P${online.slot+1}`;paused=false;fx=[];keys.clear();pressed.clear();$('overlay').hidden=true;$('continue').disabled=false;$('pause').disabled=true;$('select').hidden=true;$('game').hidden=false;$('p2-label').textContent='ONLINE · 양쪽 모두 A/D W/S J/K/L';tone(700,.2);},
  state:m=>{const pending=match?.events||[];match={...m.state,events:[...pending,...m.events]};},
  left:message=>{onlineLobby(message);$('net-ready').disabled=false;},
  closed:message=>{leaveOnline();status(message);},
  latency:ms=>{$('net-latency').textContent=`ONLINE · ${ms}ms · YOU P${online.slot+1}`;}
 };
 $('mode').onchange=onlineMode;
 $('net-create').onclick=()=>{if($('start').disabled)return;online.connect('create',chosen[0]);};
 $('net-join').onclick=()=>{if($('start').disabled)return;const code=$('net-code').value.trim().toUpperCase();if(!/^[A-F0-9]{6}$/.test(code)){status('방 코드 6자리를 입력하세요.');return;}online.connect('join',chosen[0],code);};
 $('net-ready').onclick=()=>{tone(300,.05);online.send({type:'ready'});};$('net-leave').onclick=leaveOnline;
 $('net-copy').onclick=async()=>{const url=new URL(location.href);url.searchParams.set('room',online.code);try{await navigator.clipboard.writeText(url.href);status('초대 링크를 복사했습니다. 같은 서버에 접속할 친구에게 전달하세요.');}catch{status(`초대 주소: ${url.href}`);}};
 const room=new URLSearchParams(location.search).get('room');if(room){$('mode').value='online';$('net-code').value=room.slice(0,6);}onlineMode();
}
