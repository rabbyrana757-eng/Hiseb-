import Phaser from 'phaser';
import './style.css';
import type {Building,BuildingKind,GameState,ToolKind} from './types';
import {loadGame,saveGame} from './storage';
import {advanceDay,calculateMetrics,info} from './simulation';

const TILE=48,COST:Record<string,number>={road:500,house:8000,shop:18000,office:35000,park:12000,power:60000,water:40000,hospital:70000,school:50000};
const bn=(n:number)=>Math.round(n).toLocaleString('bn-BD'),key=(x:number,y:number)=>`${x},${y}`;
const fresh=():GameState=>({version:2,mapWidth:50,mapHeight:50,money:500000,day:1,hour:8,buildings:[],roads:[],speed:1,happiness:75});
let state:GameState=fresh(),tool:ToolKind='select',selectedId:string|null=null,sceneRef:CityScene;
class CityScene extends Phaser.Scene{
 world!:Phaser.GameObjects.Container;cars:Phaser.GameObjects.Container[]=[];drag=false;px=0;py=0;down=0;lastAuto=0;dayOverlay!:Phaser.GameObjects.Rectangle;
 constructor(){super('city')}
 create(){sceneRef=this;this.cameras.main.setBackgroundColor('#7ca374');this.world=this.add.container(0,0);this.drawWorld();this.cameras.main.setBounds(-TILE*3,-TILE*3,state.mapWidth*TILE+TILE*6,state.mapHeight*TILE+TILE*6);this.cameras.main.centerOn(state.mapWidth*TILE/2,state.mapHeight*TILE/2);
 this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{this.down=Date.now();this.px=p.x;this.py=p.y;this.drag=false});
 this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{if(!p.isDown)return;const dx=p.x-this.px,dy=p.y-this.py;if(Math.abs(dx)+Math.abs(dy)>3)this.drag=true;if(this.drag){this.cameras.main.scrollX-=dx/this.cameras.main.zoom;this.cameras.main.scrollY-=dy/this.cameras.main.zoom;this.px=p.x;this.py=p.y}});
 this.input.on('pointerup',(p:Phaser.Input.Pointer)=>{if(!this.drag&&Date.now()-this.down<450)this.tap(p)});
 this.input.on('wheel',(_p:any,_o:any,_dx:number,dy:number)=>this.zoom(this.cameras.main.zoom*(dy>0?.9:1.1)));
 this.time.addEvent({delay:1000,loop:true,callback:()=>this.tick()});this.createCars();
 }
 zoom(v:number){this.cameras.main.setZoom(Phaser.Math.Clamp(v,.45,2))}
 tap(p:Phaser.Input.Pointer){const q=this.cameras.main.getWorldPoint(p.x,p.y),x=Math.floor(q.x/TILE),y=Math.floor(q.y/TILE);if(x<0||y<0||x>=state.mapWidth||y>=state.mapHeight){toast('ম্যাপের বাইরে');return}const b=state.buildings.find(v=>v.x===x&&v.y===y);
 if(tool==='select'){selectedId=b?.id??null;showSelected(b);this.drawWorld();return}
 if(tool==='bulldoze'){if(b){state.buildings=state.buildings.filter(v=>v.id!==b.id);state.money+=Math.round(COST[b.kind]*.35);selectedId=null;toast('ভবন ভাঙা হয়েছে · ৩৫% ফেরত')}else if(state.roads.includes(key(x,y))){state.roads=state.roads.filter(v=>v!==key(x,y));toast('রাস্তা সরানো হয়েছে')}this.drawWorld();refresh();return}
 if(tool==='road'){if(b){toast('এখানে ভবন আছে');return}if(!state.roads.includes(key(x,y))){if(state.money<500){toast('পর্যাপ্ত টাকা নেই');return}state.money-=500;state.roads.push(key(x,y));this.drawWorld();refresh()}return}
 if(b||state.roads.includes(key(x,y))){toast('জায়গাটি খালি নয়');return}const d=info(tool);if(state.money<d.cost){toast('পর্যাপ্ত টাকা নেই');return}if(!roadNear(x,y)){toast('ভবনের পাশে রাস্তা তৈরি করুন');return}state.money-=d.cost;state.buildings.push({id:crypto.randomUUID(),kind:tool as BuildingKind,x,y,level:1});toast(d.name+' তৈরি হয়েছে');this.drawWorld();refresh()
 }
 drawWorld(){
 this.world.removeAll(true);this.cars=[];
 const g=this.add.graphics();g.fillStyle(0x789d70,1);g.fillRect(0,0,state.mapWidth*TILE,state.mapHeight*TILE);
 // natural grass texture and subtle terrain variation
 for(let y=0;y<state.mapHeight;y++)for(let x=0;x<state.mapWidth;x++){const n=(x*37+y*71+x*y*3)%23;if(n<4){g.fillStyle(n===0?0x9bb78a:0x668d61,.22);g.fillCircle(x*TILE+((x*13)%37)+5,y*TILE+((y*17)%37)+5,2+(n%3))}}
 // trees on empty non-road tiles
 const occupied=new Set(state.buildings.map(b=>key(b.x,b.y)));const roads=new Set(state.roads);
 for(let y=0;y<state.mapHeight;y++)for(let x=0;x<state.mapWidth;x++){if(occupied.has(key(x,y))||roads.has(key(x,y)))continue;const n=(x*19+y*29+x*y*7)%31;if(n===0||n===7){this.drawTree(g,x*TILE+24,y*TILE+24,n===0?1:.78)}}
 // road tiles: sidewalk, asphalt, markings
 for(const r of state.roads){const [x,y]=r.split(',').map(Number),px=x*TILE,py=y*TILE;g.fillStyle(0xc0bba9,1);g.fillRect(px,py,TILE,TILE);g.fillStyle(0x777e7b,1);g.fillRect(px+5,py+5,TILE-10,TILE-10);g.fillStyle(0x8e9691,1);g.fillRect(px+7,py+7,TILE-14,TILE-14);g.lineStyle(1,0xe3d9b8,.65);if(!roads.has(key(x-1,y))&&!roads.has(key(x+1,y))){g.lineBetween(px+TILE/2,py+9,px+TILE/2,py+TILE-9)}else{g.lineBetween(px+9,py+TILE/2,px+TILE-9,py+TILE/2)}}
 this.world.add(g);
 // buildings with lot, garden, roof, facade, windows, driveway and shadow
 for(const b of state.buildings){const c=this.add.container(b.x*TILE,b.y*TILE);const s=this.add.graphics();const base=this.buildingColor(b.kind);
 s.fillStyle(0x26372b,.28);s.fillRoundedRect(5,9,40,37,5);s.fillStyle(b.kind==='park'?0x6ea66b:0x9caf82,1);s.fillRoundedRect(3,3,42,42,5);
 if(b.kind==='park'){s.fillStyle(0x4e8958,1);s.fillCircle(24,23,13);s.fillStyle(0x7cba77,1);s.fillCircle(19,18,7);s.fillStyle(0xb6d89c,1);s.fillCircle(29,28,6);s.fillStyle(0x9e8c6b,1);s.fillRect(22,31,4,10);s.fillStyle(0xe8d8aa,1);s.fillCircle(24,23,3)}
 else{
  s.fillStyle(0x526052,1);s.fillRoundedRect(7,8,34,32,3);s.fillStyle(base,1);s.fillRoundedRect(9,7,30,28,3);
  s.fillStyle(this.roofColor(b.kind),1);s.fillRoundedRect(7,5,34,24,3);s.lineStyle(2,0xffffff,.16);s.strokeRoundedRect(9,7,30,22,2);
  // roof panels / top-down architectural details
  s.fillStyle(0x263a31,.22);s.fillRect(12,10,24,3);s.fillStyle(0xf4e7c8,.9);s.fillRect(12,16,6,5);s.fillRect(30,16,6,5);s.fillStyle(0x526f79,.95);s.fillRect(13,17,4,3);s.fillRect(31,17,4,3);
  s.fillStyle(0x6d5540,1);s.fillRect(21,26,6,8);s.fillStyle(0xf1e3c5,.9);s.fillRect(11,29,7,3);s.fillRect(30,29,7,3);
  if(b.kind==='hospital'||b.kind==='school'||b.kind==='office'){s.fillStyle(0xf0ead7,1);s.fillRoundedRect(18,11,12,5,2);s.fillStyle(b.kind==='hospital'?0xc94e48:b.kind==='school'?0x477aa0:0x4e6b80,1);s.fillRect(23,10,2,7);s.fillRect(20,12,8,2)}
  if(b.level>1){s.fillStyle(0xf5dc80,1);s.fillCircle(35,9,3)}
 }
 c.add(s);this.world.add(c)}
 // cars follow connected road strips
 this.createCars();this.dayOverlay=this.add.rectangle(0,0,state.mapWidth*TILE,state.mapHeight*TILE,0x10223a,0).setOrigin(0);this.world.add(this.dayOverlay);
 if(selectedId){const b=state.buildings.find(v=>v.id===selectedId);if(b){const outline=this.add.graphics();outline.lineStyle(3,0xffe38a,1);outline.strokeRoundedRect(b.x*TILE+1,b.y*TILE+1,TILE-2,TILE-2,5);this.world.add(outline)}}
 }
 drawTree(g:Phaser.GameObjects.Graphics,x:number,y:number,scale:number){g.fillStyle(0x314b32,.3);g.fillEllipse(x+3,y+7,27*scale,14*scale);g.fillStyle(0x6c5037,1);g.fillRect(x-2,y-1,4,11);g.fillStyle(0x286b3c,1);g.fillCircle(x,y-4,11*scale);g.fillStyle(0x438c4e,1);g.fillCircle(x-4,y-8,7*scale);g.fillStyle(0x72aa5c,1);g.fillCircle(x+4,y-7,5*scale)}
 buildingColor(k:string){return ({house:0xd9c7a5,shop:0xd9a06c,office:0x9cb7c2,park:0x70aa72,power:0x999b9b,water:0x85b9c9,hospital:0xd8ddd6,school:0xd8c78f} as Record<string,number>)[k]??0xd9c7a5}
 roofColor(k:string){return ({house:0x9b7654,shop:0x9a5842,office:0x557b8b,power:0x626d70,water:0x4d8da3,hospital:0x9ba9a2,school:0x9c8654} as Record<string,number>)[k]??0x9b7654}
 createCars(){const rows=new Map<number,number[]>();for(const r of state.roads){const [x,y]=r.split(',').map(Number);if(!rows.has(y))rows.set(y,[]);rows.get(y)!.push(x)}let count=0;for(const [y,xs] of rows){xs.sort((a,b)=>a-b);if(xs.length<4||count>=7)continue;const start=xs[0],end=xs[xs.length-1],car=this.add.container(start*TILE+24,y*TILE+24);const cg=this.add.graphics();const color=[0xd9e4eb,0xc85b4f,0x3f78a4,0xe5c45d][count%4];cg.fillStyle(0x26332b,.35);cg.fillRoundedRect(-10,-5,23,13,4);cg.fillStyle(color,1);cg.fillRoundedRect(-11,-7,22,12,4);cg.fillStyle(0x9ac9d6,1);cg.fillRoundedRect(-6,-6,10,5,2);cg.fillStyle(0xf5e5a0,1);cg.fillRect(9,-5,2,3);car.add(cg);this.world.add(car);this.tweens.add({targets:car,x:end*TILE+24,duration:Math.max(8000,(end-start)*1600),repeat:-1,yoyo:true,ease:'Linear'});count++}}
 tick(){if(state.speed===0)return;state.hour+=state.speed*2;if(state.hour>=24){state.hour=0;state=advanceDay(state);refresh();toast('নতুন দিন শুরু হয়েছে')}const night=state.hour<6||state.hour>=19; if(this.dayOverlay)this.dayOverlay.setAlpha(night?.25:state.hour<8||state.hour>17?.08:0);clock();if(Date.now()-this.lastAuto>30000){this.lastAuto=Date.now();void saveGame(state).then(()=>setSave('অটো সেভ হয়েছে'))}}
}
function roadNear(x:number,y:number){return [[0,-1],[1,0],[0,1],[-1,0]].some(([a,b])=>state.roads.includes(key(x+a,y+b)))}
function toast(s:string){const e=document.getElementById('notice');if(e)e.textContent=s}
function setSave(s:string){const e=document.getElementById('saveStatus');if(e)e.textContent=s}
function clock(){const e=document.getElementById('clock');if(e)e.textContent=`দিন ${bn(state.day)} · ${bn(Math.floor(state.hour)).padStart(2,'০')}:০০`}
function showSelected(b?:Building){const e=document.getElementById('selectedCard')!;if(!b){e.innerHTML='<small>নির্বাচিত স্থাপনা</small><h3>কোনো ভবন নির্বাচন করা হয়নি</h3><p>ম্যাপের কোনো ভবনে ট্যাপ করে তথ্য দেখুন।</p>';return}const d=info(b.kind);e.innerHTML=`<small>নির্বাচিত স্থাপনা</small><h3>${d.name} · Level ${b.level}</h3><p>${d.description}</p><button id="upgradeBtn" class="expand-btn">আপগ্রেড · ৳${bn(Math.round(COST[b.kind]*.65))}</button>`;document.getElementById('upgradeBtn')?.addEventListener('click',()=>{const cost=Math.round(COST[b.kind]*.65);if(state.money<cost){toast('পর্যাপ্ত টাকা নেই');return}state.money-=cost;b.level++;sceneRef.drawWorld();showSelected(b);refresh();toast('আপগ্রেড সম্পন্ন')})}
function setTool(t:ToolKind){tool=t;document.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===t));toast(t==='select'?'ভবন নির্বাচন করুন':t==='road'?'রাস্তা তৈরি করুন':t==='bulldoze'?'ভাঙার জন্য ট্যাপ করুন':info(t).name+' বসানোর জায়গা নির্বাচন করুন')}
function refresh(){const m=calculateMetrics(state.buildings),net=m.income-m.expenses;const set=(id:string,v:string)=>{const e=document.getElementById(id);if(e)e.textContent=v};set('money','৳'+bn(state.money));set('population',bn(m.population));set('happiness',bn(state.happiness)+'%');set('net',(net>=0?'+':'')+'৳'+bn(net));set('powerStatus',`${bn(m.powerSupply)} / ${bn(m.powerNeed)}`);set('waterStatus',`${bn(m.waterSupply)} / ${bn(m.waterNeed)}`);set('jobsStatus',bn(Math.min(100,Math.round(m.jobs/Math.max(1,m.population)*100)))+'%');const p=m.powerNeed?Math.min(100,m.powerSupply/m.powerNeed*100):100,w=m.waterNeed?Math.min(100,m.waterSupply/m.waterNeed*100):100,j=Math.min(100,m.jobs/Math.max(1,m.population)*100);(document.getElementById('powerBar') as HTMLElement).style.width=p+'%';(document.getElementById('waterBar') as HTMLElement).style.width=w+'%';(document.getElementById('jobsBar') as HTMLElement).style.width=j+'%';set('mapSize',`ম্যাপ ${bn(state.mapWidth)} × ${bn(state.mapHeight)}`);clock()}
function bind(){document.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.tool as ToolKind));document.getElementById('zoomIn')!.onclick=()=>sceneRef.zoom(sceneRef.cameras.main.zoom*1.2);document.getElementById('zoomOut')!.onclick=()=>sceneRef.zoom(sceneRef.cameras.main.zoom/1.2);document.getElementById('centerMap')!.onclick=()=>sceneRef.cameras.main.centerOn(state.mapWidth*TILE/2,state.mapHeight*TILE/2);document.getElementById('saveBtn')!.onclick=async()=>{await saveGame(state);setSave('সেভ সম্পন্ন')};document.getElementById('loadBtn')!.onclick=async()=>{const s=await loadGame();if(s){state=s;sceneRef.drawWorld();refresh();toast('শহর লোড হয়েছে')}else toast('কোনো সেভ নেই')};document.getElementById('expandBtn')!.onclick=()=>{if(state.money<50000){toast('পর্যাপ্ত টাকা নেই');return}state.money-=50000;state.mapWidth+=25;state.mapHeight+=25;sceneRef.cameras.main.setBounds(-TILE*3,-TILE*3,state.mapWidth*TILE+TILE*6,state.mapHeight*TILE+TILE*6);sceneRef.drawWorld();refresh();toast('শহরের সীমানা বেড়েছে')};document.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach(b=>b.onclick=()=>{state.speed=Number(b.dataset.speed);document.querySelectorAll('[data-speed]').forEach(x=>x.classList.toggle('speed-active',x===b));toast(state.speed===0?'গেম Pause':'গেমের গতি পরিবর্তন হয়েছে')})}
async function boot(){const s=await loadGame().catch(()=>null);if(s)state=s;new Phaser.Game({type:Phaser.AUTO,parent:'game',backgroundColor:'#789d70',scale:{mode:Phaser.Scale.RESIZE,width:'100%',height:'100%'},render:{antialias:true},scene:[CityScene]});bind();refresh()}
boot();
