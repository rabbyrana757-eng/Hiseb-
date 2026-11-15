import Phaser from 'phaser';
import './style.css';
import type {Building,BuildingKind,GameState,ToolKind} from './types';
import {loadGame,saveGame} from './storage';
import {advanceDay,calculateMetrics,getBuildingInfo} from './simulation';

const COST:Record<string,number>={road:500,house:8000,shop:18000,office:35000,park:12000,power:60000,water:40000,hospital:70000,school:50000};
const TILE=32, COLORS:Record<string,number>={house:0xd9b98b,shop:0xd78d64,office:0x8ca8ba,park:0x65a66c,power:0x777b83,water:0x62a9cb,hospital:0xe9e4d8,school:0xd5c17e};
const bn=(n:number)=>Math.round(n).toLocaleString('bn-BD');
const key=(x:number,y:number)=>`${x},${y}`;
const defaultState=():GameState=>({version:1,mapWidth:50,mapHeight:50,money:500000,day:1,hour:8,buildings:[],roads:[],speed:1,happiness:75});
let state:GameState=defaultState(),tool:ToolKind='select',selectedId:string|null=null,sceneRef:CityScene;
let game:Phaser.Game;

class CityScene extends Phaser.Scene{
 world!:Phaser.GameObjects.Container; grid!:Phaser.GameObjects.Graphics; objects=new Map<string,Phaser.GameObjects.Container>(); selectedOutline!:Phaser.GameObjects.Graphics;
 dragging=false;lastX=0;lastY=0;pointerDownAt=0;lastTick=0;lastAutosave=0;
 constructor(){super('city')}
 create(){
  sceneRef=this;this.cameras.main.setBackgroundColor('#76956d');
  this.world=this.add.container(0,0);this.grid=this.add.graphics();this.world.add(this.grid);
  this.selectedOutline=this.add.graphics();this.world.add(this.selectedOutline);
  this.drawWorld();this.cameras.main.setBounds(-TILE*4,-TILE*4,state.mapWidth*TILE+TILE*8,state.mapHeight*TILE+TILE*8);
  this.cameras.main.centerOn(state.mapWidth*TILE/2,state.mapHeight*TILE/2);
  this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{this.pointerDownAt=Date.now();this.lastX=p.x;this.lastY=p.y;this.dragging=false});
  this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{if(!p.isDown)return;const dx=p.x-this.lastX,dy=p.y-this.lastY;if(Math.abs(dx)+Math.abs(dy)>3)this.dragging=true;if(this.dragging){this.cameras.main.scrollX-=dx/this.cameras.main.zoom;this.cameras.main.scrollY-=dy/this.cameras.main.zoom;this.lastX=p.x;this.lastY=p.y}});
  this.input.on('pointerup',(p:Phaser.Input.Pointer)=>{if(!this.dragging&&Date.now()-this.pointerDownAt<450)this.handleTap(p)});
  this.input.on('wheel',(_p:any,_objs:any,_dx:number,dy:number)=>this.setZoom(this.cameras.main.zoom*(dy>0?.9:1.1)));
  this.scale.on('resize',()=>this.cameras.main.setViewport(0,0,this.scale.width,this.scale.height));
  this.time.addEvent({delay:1000,loop:true,callback:()=>this.tick()});
  this.input.keyboard?.on('keydown-ESC',()=>setTool('select'));
 }
 setZoom(z:number){this.cameras.main.setZoom(Phaser.Math.Clamp(z,.45,2.2))}
 handleTap(p:Phaser.Input.Pointer){
  const pt=this.cameras.main.getWorldPoint(p.x,p.y),x=Math.floor(pt.x/TILE),y=Math.floor(pt.y/TILE);
  if(x<0||y<0||x>=state.mapWidth||y>=state.mapHeight){notify('ম্যাপের বাইরে। ম্যাপ বড় করুন।');return}
  const b=state.buildings.find(v=>v.x===x&&v.y===y);
  if(tool==='select'){selectedId=b?.id??null;showSelected(b);this.drawWorld();return}
  if(tool==='bulldoze'){if(b){state.buildings=state.buildings.filter(v=>v.id!==b.id);state.money+=Math.round((COST[b.kind]??0)*.35);selectedId=null;notify('ভবন সরানো হয়েছে · ৩৫% ফেরত');}else if(state.roads.includes(key(x,y))){state.roads=state.roads.filter(v=>v!==key(x,y));notify('রাস্তা সরানো হয়েছে');}this.drawWorld();refreshUI();return}
  if(tool==='road'){if(b){notify('এই টাইল দখল করা আছে');return}if(!state.roads.includes(key(x,y))){if(state.money<COST.road){notify('পর্যাপ্ত টাকা নেই');return}state.money-=COST.road;state.roads.push(key(x,y));this.drawWorld();refreshUI()}return}
  if(b||state.roads.includes(key(x,y))){notify('এই জায়গাটি খালি নয়');return}
  const info=getBuildingInfo(tool);
  if(state.money<info.cost){notify('পর্যাপ্ত টাকা নেই');return}
  if(!hasRoadNearby(x,y)){notify('ভবন বসাতে কাছাকাছি রাস্তা তৈরি করুন');return}
  state.money-=info.cost;state.buildings.push({id:crypto.randomUUID(),kind:tool as BuildingKind,x,y,level:1});notify(info.name+' তৈরি হয়েছে');this.drawWorld();refreshUI();
 }
 drawWorld(){
  this.world.removeAll(true);this.objects.clear();
  const g=this.add.graphics();g.fillStyle(0x78966f,1);g.fillRect(0,0,state.mapWidth*TILE,state.mapHeight*TILE);
  for(let y=0;y<state.mapHeight;y++)for(let x=0;x<state.mapWidth;x++){
   const v=((x*17+y*31)%11);g.fillStyle(v<2?0x819d75:0x78966f,0.35);g.fillRect(x*TILE,y*TILE,TILE,TILE);
  }
  g.lineStyle(1,0x456b50,.22);for(let x=0;x<=state.mapWidth;x++)g.lineBetween(x*TILE,0,x*TILE,state.mapHeight*TILE);for(let y=0;y<=state.mapHeight;y++)g.lineBetween(0,y*TILE,state.mapWidth*TILE,y*TILE);
  this.world.add(g);
  for(const r of state.roads){const [x,y]=r.split(',').map(Number);const road=this.add.graphics();road.fillStyle(0x777b78,1);road.fillRect(x*TILE,y*TILE,TILE,TILE);road.fillStyle(0x969b96,1);road.fillRect(x*TILE+2,y*TILE+2,TILE-4,TILE-4);road.lineStyle(1,0xc4c9be,.7);road.lineBetween(x*TILE+4,y*TILE+TILE/2,x*TILE+TILE-4,y*TILE+TILE/2);this.world.add(road)}
  for(const b of state.buildings){const c=this.add.container(b.x*TILE,b.y*TILE);const color=COLORS[b.kind];const shadow=this.add.rectangle(18,20,25,23,0x263329,.35);const body=this.add.rectangle(16,15,23,21,color).setStrokeStyle(1,0x344339,.9);const roof=this.add.triangle(16,4,3,13,29,13,16,-1,shade(color,-18)).setStrokeStyle(1,0x344339,.7);const door=this.add.rectangle(16,20,5,10,0x564a3a);c.add([shadow,body,roof,door]);if(b.level>1)c.add(this.add.text(24,-2,'★',{fontSize:'10px',color:'#fff3b0'}));this.world.add(c);this.objects.set(b.id,c)}
  this.selectedOutline=this.add.graphics();this.world.add(this.selectedOutline);if(selectedId){const b=state.buildings.find(v=>v.id===selectedId);if(b)this.selectedOutline.lineStyle(2,0xffe58a,1).strokeRect(b.x*TILE+1,b.y*TILE+1,TILE-2,TILE-2)}
 }
 tick(){
  if(state.speed===0)return;state.hour+=state.speed*2;
  if(state.hour>=24){state.hour=0;state=advanceDay(state);refreshUI();notify('নতুন দিন শুরু হয়েছে');}
  updateClock();if(Date.now()-this.lastAutosave>30000){this.lastAutosave=Date.now();void saveGame(state).then(()=>setSaveStatus('অটো সেভ হয়েছে'))}
 }
}
function shade(color:number,amt:number){const r=Math.max(0,Math.min(255,((color>>16)&255)+amt)),g=Math.max(0,Math.min(255,((color>>8)&255)+amt)),b=Math.max(0,Math.min(255,(color&255)+amt));return (r<<16)|(g<<8)|b}
function hasRoadNearby(x:number,y:number){return [[0,-1],[1,0],[0,1],[-1,0]].some(([dx,dy])=>state.roads.includes(key(x+dx,y+dy)))}
function notify(s:string){const el=document.getElementById('notice');if(el)el.textContent=s}
function setSaveStatus(s:string){const el=document.getElementById('saveStatus');if(el)el.textContent=s}
function updateClock(){const el=document.getElementById('clock');if(el)el.textContent=`দিন ${bn(state.day)} · ${bn(Math.floor(state.hour)).padStart(2,'০')}:০০`}
function showSelected(b?:Building){
 const el=document.getElementById('selectedCard')!;if(!b){el.innerHTML='<small>SELECTED OBJECT</small><h3>কোনো ভবন নির্বাচন করা হয়নি</h3><p>ম্যাপের কোনো ভবনে ট্যাপ করলে বিস্তারিত দেখা যাবে।</p>';return}
 const info=getBuildingInfo(b.kind);el.innerHTML=`<small>SELECTED OBJECT</small><h3>${info.name} · Level ${b.level}</h3><p>${info.description}</p><div class="actions-row"><button id="upgradeBtn" class="primary">আপগ্রেড · ৳${bn(Math.round(COST[b.kind]*.65))}</button></div>`;
 document.getElementById('upgradeBtn')?.addEventListener('click',()=>{const cost=Math.round(COST[b.kind]*.65);if(state.money<cost){notify('পর্যাপ্ত টাকা নেই');return}state.money-=cost;b.level++;sceneRef.drawWorld();showSelected(b);refreshUI();notify('ভবন আপগ্রেড হয়েছে')});
}
function setTool(t:ToolKind){tool=t;document.querySelectorAll<HTMLButtonElement>('.tool').forEach(b=>b.classList.toggle('active',b.dataset.tool===t));notify(t==='select'?'ভবন নির্বাচন করুন':t==='road'?'রাস্তা আঁকুন':t==='bulldoze'?'যা সরাতে চান তাতে ট্যাপ করুন':getBuildingInfo(t).name+' বসানোর জায়গা নির্বাচন করুন')}
function refreshUI(){
 const m=calculateMetrics(state.buildings),net=m.income-m.expenses;
 const set=(id:string,s:string)=>{const e=document.getElementById(id);if(e)e.textContent=s};
 set('money','৳'+bn(state.money));set('population',bn(m.population));set('happiness',bn(state.happiness)+'%');set('net',(net>=0?'+':'')+'৳'+bn(net));
 set('powerStatus',`${bn(m.powerSupply)} / ${bn(m.powerNeed)}`);set('waterStatus',`${bn(m.waterSupply)} / ${bn(m.waterNeed)}`);
 set('jobsStatus',`${bn(Math.min(100,Math.round(m.jobs/Math.max(1,m.population)*100)))}%`);
 const p=m.powerNeed?Math.min(100,m.powerSupply/m.powerNeed*100):100,w=m.waterNeed?Math.min(100,m.waterSupply/m.waterNeed*100):100,j=Math.min(100,m.jobs/Math.max(1,m.population)*100);
 (document.getElementById('powerBar') as HTMLElement).style.width=p+'%';(document.getElementById('waterBar') as HTMLElement).style.width=w+'%';(document.getElementById('jobsBar') as HTMLElement).style.width=j+'%';
 set('mapSize',`ম্যাপ: ${bn(state.mapWidth)} × ${bn(state.mapHeight)}`);updateClock();
}
function bindUI(){
 document.querySelectorAll<HTMLButtonElement>('.tool').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool as ToolKind)));
 document.getElementById('zoomIn')!.onclick=()=>sceneRef.setZoom(sceneRef.cameras.main.zoom*1.2);
 document.getElementById('zoomOut')!.onclick=()=>sceneRef.setZoom(sceneRef.cameras.main.zoom/1.2);
 document.getElementById('centerMap')!.onclick=()=>sceneRef.cameras.main.centerOn(state.mapWidth*TILE/2,state.mapHeight*TILE/2);
 document.getElementById('saveBtn')!.onclick=async()=>{await saveGame(state);setSaveStatus('সেভ সম্পন্ন · '+new Date().toLocaleTimeString('bn-BD'))};
 document.getElementById('loadBtn')!.onclick=async()=>{const s=await loadGame();if(s){state=s;selectedId=null;sceneRef.drawWorld();refreshUI();notify('সেভ করা শহর লোড হয়েছে')}else notify('কোনো সেভ পাওয়া যায়নি')};
 document.getElementById('expandBtn')!.onclick=()=>{const cost=50000;if(state.money<cost){notify('ম্যাপ বড় করতে ৳৫০,০০০ লাগবে');return}state.money-=cost;state.mapWidth+=25;state.mapHeight+=25;sceneRef.cameras.main.setBounds(-TILE*4,-TILE*4,state.mapWidth*TILE+TILE*8,state.mapHeight*TILE+TILE*8);sceneRef.drawWorld();refreshUI();notify('ম্যাপ ২৫ × ২৫ টাইল বড় হয়েছে')};
 document.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach(b=>b.onclick=()=>{state.speed=Number(b.dataset.speed);document.querySelectorAll('[data-speed]').forEach(x=>x.classList.toggle('speed-active',x===b));notify(state.speed===0?'গেম Pause':state.speed===1?'স্বাভাবিক গতি':'দ্রুত গতি')});
}
async function boot(){
 const saved=await loadGame().catch(()=>null);if(saved)state=saved;
 game=new Phaser.Game({type:Phaser.AUTO,parent:'game',backgroundColor:'#78966f',scale:{mode:Phaser.Scale.RESIZE,width:'100%',height:'100%'},render:{antialias:true,pixelArt:false},scene:[CityScene]});
 bindUI();refreshUI();
}
boot();
