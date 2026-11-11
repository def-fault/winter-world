'use strict';
const socketOnline={
 socket:null,active:false,slot:null,code:'',seq:0,hooks:{},lastSend:0,pingTimer:null,watchdog:null,lastMessage:0,
 send(message){if(this.socket?.readyState===WebSocket.OPEN)this.socket.send(JSON.stringify(message));},
 connect(type,character,code){
  if(!['http:','https:'].includes(location.protocol)){this.hooks.status('온라인 대전은 서버 주소로 접속해야 합니다. start-online.cmd를 실행한 뒤 http://localhost:3000 을 열어주세요.');return;}
  this.disconnect();this.hooks.status('서버에 연결하는 중…');this.hooks.busy(true);
  const ws=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/ws`);this.socket=ws;this.lastMessage=Date.now();
  ws.onopen=()=>{if(this.socket!==ws)return;this.send({type,character,code});this.pingTimer=setInterval(()=>this.send({type:'ping',time:Date.now()}),2000);};
  ws.onmessage=e=>{if(this.socket!==ws)return;let m;try{m=JSON.parse(e.data);}catch{return;}this.lastMessage=Date.now();
   if(m.type==='joined'){this.active=true;this.slot=m.slot;this.code=m.code;this.seq=0;this.hooks.joined(m);}
   if(m.type==='room')this.hooks.room(m);
   if(m.type==='state')this.hooks.state(m);
   if(m.type==='start')this.hooks.start();
   if(m.type==='left')this.hooks.left(m.message);
   if(m.type==='pong')this.hooks.latency(Date.now()-m.time);
   if(m.type==='error'){this.hooks.status(m.message);this.hooks.busy(false);if(!this.active)this.disconnect();}
  };
  ws.onerror=()=>this.hooks.status('서버에 연결할 수 없습니다. 서버 실행 상태와 주소를 확인하세요.');
  ws.onclose=()=>{if(this.socket!==ws)return;this.disconnect();this.hooks.closed('연결이 끊겼습니다. 방 코드로 다시 참가할 수 있습니다.');};
  this.watchdog=setInterval(()=>{if(Date.now()-this.lastMessage>8000){this.disconnect();this.hooks.closed('서버 응답이 없어 연결을 종료했습니다. 다시 참가해주세요.');}},2000);
 },
 input(input,force=false){if(!this.active)return;const now=performance.now(),pulse=input.jump||input.light||input.heavy||input.special;if(!force&&!pulse&&now-this.lastSend<30)return;this.lastSend=now;this.send({type:'input',seq:++this.seq,input});},
 disconnect(){const ws=this.socket;this.socket=null;clearInterval(this.pingTimer);clearInterval(this.watchdog);this.active=false;this.slot=null;this.code='';if(ws){if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({type:'leave'}));ws.close();}}
};
