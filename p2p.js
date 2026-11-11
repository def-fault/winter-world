'use strict';
// Pages mode: PeerServer only introduces peers. The host browser owns combat.
const peerOnline={
 active:false,slot:null,code:'',hooks:{},peer:null,conn:null,sim:null,players:[null,null],
 seq:0,lastSeq:-1,held:{},pulses:{},own:{},ownPulse:{},lastInput:0,lastMessage:0,
 timer:null,pingTimer:null,timeout:null,lastClock:0,accumulator:0,tick:0,
 emit(type,data={}){this.hooks[type]?.(data);},
 wire(data){if(this.conn?.open)this.conn.send(data);},
 room(){const data={code:this.code,players:this.players,running:!!this.sim};this.emit('room',data);this.wire({type:'room',...data});},
 connect(type,character,code){
  if(!['https:','http:'].includes(location.protocol)){this.hooks.status('웹사이트 주소에서 열어주세요. 파일을 직접 열면 친구와 연결할 수 없습니다.');return;}
  if(typeof Peer==='undefined'){this.hooks.status('연결 모듈을 불러오지 못했습니다. 새로고침해주세요.');return;}
  this.disconnect();this.hooks.busy(true);this.hooks.status('친구와 연결할 준비 중…');
  this.slot=type==='create'?0:1;this.code=type==='create'?Array.from(crypto.getRandomValues(new Uint8Array(3)),v=>v.toString(16).padStart(2,'0')).join('').toUpperCase():code;
  this.character=character;this.players=[null,null];this.lastSeq=-1;this.seq=0;
  const peer=new Peer(this.slot===0?'winterworld-v1-'+this.code:undefined,{debug:0});this.peer=peer;
  this.timeout=setTimeout(()=>this.fail('연결 시간이 초과되었습니다. 새 방을 만들거나 다른 네트워크에서 시도해주세요.'),20000);
  peer.on('open',()=>{if(this.peer!==peer)return;
   if(this.slot===0){clearTimeout(this.timeout);this.active=true;this.players[0]={character,ready:true};this.emit('joined',{code:this.code,slot:0});this.room();this.hooks.status('초대 링크를 친구에게 보내세요. 친구가 참가하면 바로 시작합니다.');}
   else this.bind(peer.connect('winterworld-v1-'+this.code,{reliable:true,serialization:'json'}));
  });
  peer.on('connection',conn=>{if(this.peer!==peer)return conn.close();if(this.slot!==0||this.conn){conn.on('open',()=>{conn.send({type:'error',message:'이미 다른 친구가 참가한 방입니다.'});setTimeout(()=>conn.close(),100);});return;}this.bind(conn);});
  peer.on('error',err=>{if(this.peer!==peer)return;const message=err.type==='peer-unavailable'?'방을 찾지 못했습니다. 방장이 게임을 열어 두었는지 확인하세요.':err.type==='unavailable-id'?'방 코드가 겹쳤습니다. 방 만들기를 다시 눌러주세요.':'직접 연결하지 못했습니다. 다른 네트워크를 이용하거나 잠시 후 다시 시도해주세요.';this.fail(message);});
  peer.on('disconnected',()=>{if(this.peer===peer&&!peer.destroyed)peer.reconnect();});
 },
 bind(conn){
  this.conn=conn;this.lastMessage=Date.now();
  conn.on('open',()=>{if(this.conn!==conn)return;this.lastMessage=Date.now();
   if(this.slot===1)this.wire({type:'hello',version:1,character:this.character});
   this.pingTimer=setInterval(()=>{if(Date.now()-this.lastMessage>12000){this.peerLeft();return;}this.wire({type:'ping',time:Date.now()});},2000);
  });
  conn.on('data',m=>{if(this.conn!==conn||!m||typeof m!=='object')return;this.lastMessage=Date.now();
   if(m.type==='ping'){if(Number.isFinite(m.time))this.wire({type:'pong',time:m.time});return;}
   if(m.type==='pong'){if(Number.isFinite(m.time))this.hooks.latency(Math.max(0,Date.now()-m.time));return;}
   if(m.type==='error'){this.fail(m.message||'참가할 수 없습니다.');return;}
   if(m.type==='leave'){this.peerLeft();return;}
   if(this.slot===0){
    if(m.type==='hello'&&!this.players[1]){
     if(m.version!==1||!Number.isInteger(m.character)||!WinterFight.roster[m.character])return this.peerLeft();
     this.players[1]={character:m.character,ready:true};this.lastSeq=-1;this.held={};this.pulses={};this.wire({type:'joined',code:this.code,slot:1});this.room();this.begin();
    }else if(m.type==='ready'&&this.players[1]){this.players[1].ready=true;this.room();this.begin();}
    else if(m.type==='input'&&Number.isSafeInteger(m.seq)&&m.seq>this.lastSeq){this.lastSeq=m.seq;this.lastInput=Date.now();const input=m.input||{};for(const k of ['left','right','guard'])this.held[k]=input[k]===true;for(const k of ['jump','light','heavy','special'])if(input[k]===true)this.pulses[k]=true;}
   }else{
    if(m.type==='joined'){clearTimeout(this.timeout);this.active=true;this.emit('joined',m);}
    if(m.type==='room'){this.players=m.players;this.emit('room',m);}
    if(m.type==='start')this.emit('start');
    if(m.type==='state')this.emit('state',m);
   }
  });
  conn.on('close',()=>{if(this.conn===conn)this.peerLeft();});conn.on('error',()=>{if(this.conn===conn)this.peerLeft();});
 },
 begin(){
  if(!this.players.every(p=>p?.ready)||this.slot!==0)return;
  if(this.sim&&!['round','finished'].includes(this.sim.phase))return;
  if(!this.sim||this.sim.phase==='finished')this.sim=new WinterFight.Match(...this.players.map(p=>p.character),'online');else this.sim.reset();
  this.sim.mode='online';this.players.forEach(p=>p.ready=false);this.held={};this.pulses={};this.own={};this.ownPulse={};
  this.emit('start');this.wire({type:'start'});this.snapshot();this.room();
  clearInterval(this.timer);this.lastClock=performance.now();this.accumulator=0;
  this.timer=setInterval(()=>{const now=performance.now();this.accumulator+=Math.min(.1,(now-this.lastClock)/1000);this.lastClock=now;while(this.accumulator>=1/60){this.accumulator-=1/60;this.step();}},8);
 },
 step(){if(!this.sim)return;if(Date.now()-this.lastInput>350){this.held={};this.pulses={};}
  const consume=this.sim.phase==='fight'&&this.sim.hitstop<=0;
  this.sim.step(1/60,[{...this.own,...this.ownPulse},{...this.held,...this.pulses}]);
  if(consume||this.sim.phase==='intro'){this.ownPulse={};this.pulses={};}
  if(++this.tick%2===0)this.snapshot();
 },
 snapshot(){if(!this.sim)return;const m=this.sim;const packet={type:'state',tick:this.tick,events:m.events.splice(0),state:{mode:'online',time:m.time,phase:m.phase,wait:m.wait,round:m.round,wins:m.wins,winner:m.winner,hitstop:m.hitstop,fighters:m.fighters,shots:m.shots}};this.wire(packet);this.emit('state',structuredClone(packet));},
 input(input){if(!this.active)return;if(this.slot===0){for(const k of ['left','right','guard'])this.own[k]=input[k]===true;for(const k of ['jump','light','heavy','special'])if(input[k])this.ownPulse[k]=true;}
  else {const now=performance.now();if(!input.jump&&!input.light&&!input.heavy&&!input.special&&now-(this.lastSend||0)<30)return;this.lastSend=now;this.wire({type:'input',seq:++this.seq,input});}
 },
 send(m){if(m.type==='ready'&&this.slot===0){if(this.players[0])this.players[0].ready=true;this.room();this.begin();}else this.wire(m);},
 peerLeft(){const conn=this.conn;this.conn=null;clearInterval(this.pingTimer);clearInterval(this.timer);this.sim=null;this.held={};this.pulses={};if(conn)conn.close();if(this.slot===0&&this.active){this.players[1]=null;this.players[0].ready=true;this.emit('left','친구가 나갔습니다. 같은 초대 링크로 다시 참가할 수 있습니다.');this.room();}else this.fail('방장과 연결이 끊겼습니다. 방장이 게임을 열어 둔 뒤 다시 참가해주세요.');},
 fail(message){this.disconnect();this.hooks.closed(message);},
 disconnect(){clearInterval(this.timer);clearInterval(this.pingTimer);clearTimeout(this.timeout);const conn=this.conn,peer=this.peer;this.conn=null;this.peer=null;this.active=false;this.sim=null;this.slot=null;this.code='';if(conn){try{if(conn.open)conn.send({type:'leave'});}catch{}conn.close();}if(peer)peer.destroy();}
};
const online=new URLSearchParams(location.search).get('transport')==='server'?socketOnline:peerOnline;
