import { LEVELS } from './levels';

const CELL = 18, HALF = 6, STEP = 1 / 120;
const GRAVITY = 1050, MAX_FALL = 760, SPEED = 245, JUMP = 420, HOOK_RANGE = 430;
const C = {
  bg:'#030609', wall:'#39458f', wall2:'#1b2358', player:'#31ff6a', anchor:'#ffd969',
  hazard:'#ff5858', checkpoint:'#61ff98', exit:'#c563ff', rope:'#d6945e', bubble:'#58ebff',
  ui:'#42d9ff', dim:'#39545c', star:'#17232f', aim:'#657581'
};
type V = { x:number; y:number };
type Action = 'left'|'right'|'jump'|'hook'|'bubble'|'in'|'out';

type World = {
  grid:string[][]; w:number; h:number; start:V; exit:V; anchors:V[]; checkpoints:V[]; name:string;
};

class Input {
  down = new Set<Action>();
  pressed = new Set<Action>();
  aim:V = {x:0,y:0};
  aimed = false;
  set(a:Action,v:boolean){
    if(v){ if(!this.down.has(a)) this.pressed.add(a); this.down.add(a); }
    else this.down.delete(a);
  }
  take(a:Action){ const v=this.pressed.has(a); this.pressed.delete(a); return v; }
  has(a:Action){ return this.down.has(a); }
}

export class GlyphhookGame {
  private ctx:CanvasRenderingContext2D;
  private input = new Input();
  private world!:World;
  private level = 0;
  private p:V={x:0,y:0}; private v:V={x:0,y:0}; private spawn:V={x:0,y:0};
  private grounded=false; private coyote=0; private jumpBuffer=0;
  private anchor:V|null=null; private rope=0;
  private bubbleReady=true; private bubbleFx=0; private bubblePos:V={x:0,y:0};
  private cam:V={x:0,y:0}; private view:V={x:0,y:0}; private dpr=1;
  private last=0; private acc=0; private clearTimer=0; private deaths=0; private started=performance.now();
  private stars:V[]=[];

  constructor(private canvas:HTMLCanvasElement){
    const ctx=canvas.getContext('2d'); if(!ctx) throw new Error('Canvas 2D unavailable'); this.ctx=ctx;
    this.stars=this.makeStars(); this.load(0); this.bind(); this.resize();
    addEventListener('resize',()=>this.resize());
  }

  start(){ requestAnimationFrame(t=>this.frame(t)); }
  private frame(t:number){
    if(!this.last) this.last=t; this.acc+=Math.min((t-this.last)/1000,.05); this.last=t;
    while(this.acc>=STEP){ this.update(STEP); this.acc-=STEP; }
    this.draw(); requestAnimationFrame(n=>this.frame(n));
  }

  private update(dt:number){
    if(this.clearTimer>0){ this.clearTimer-=dt; if(this.clearTimer<=0) this.load((this.level+1)%LEVELS.length); return; }
    this.coyote=this.grounded?.1:Math.max(0,this.coyote-dt); this.jumpBuffer=Math.max(0,this.jumpBuffer-dt); this.bubbleFx=Math.max(0,this.bubbleFx-dt);
    if(this.input.take('jump')) this.jumpBuffer=.1;
    if(this.jumpBuffer>0&&this.coyote>0){ this.v.y=-JUMP; this.grounded=false; this.coyote=0; this.jumpBuffer=0; }

    const move=Number(this.input.has('right'))-Number(this.input.has('left'));
    const target=move*SPEED, accel=(this.grounded?1500:920)*dt;
    this.v.x=move?approach(this.v.x,target,accel):this.grounded?approach(this.v.x,0,1800*dt):this.v.x;

    if(this.input.take('hook')) this.hook();
    if(!this.input.has('hook')) this.anchor=null;
    if(this.input.take('bubble')&&this.bubbleReady) this.bubble();
    if(this.anchor){
      if(this.input.has('in')) this.rope=Math.max(42,this.rope-125*dt);
      if(this.input.has('out')) this.rope=Math.min(HOOK_RANGE,this.rope+125*dt);
    }

    this.v.y=Math.min(MAX_FALL,this.v.y+GRAVITY*dt);
    this.move(this.v.x*dt,0); this.move(0,this.v.y*dt); this.solveRope();
    if(this.hit('^')||this.p.y>this.world.h*CELL+120){ this.die(); return; }
    for(const cp of this.world.checkpoints) if(dist(this.p,cp)<14){ this.spawn={...cp}; this.bubbleReady=true; }
    if(dist(this.p,this.world.exit)<14){ this.anchor=null; this.clearTimer=.8; }

    const mx=Math.max(0,this.world.w*CELL-this.view.x), my=Math.max(0,this.world.h*CELL-this.view.y);
    const tx=clamp(this.p.x-this.view.x*.5,0,mx), ty=clamp(this.p.y-this.view.y*.55,0,my);
    const f=1-Math.exp(-8*dt); this.cam.x+=(tx-this.cam.x)*f; this.cam.y+=(ty-this.cam.y)*f;
  }

  private move(dx:number,dy:number){
    if(dx){
      this.p.x+=dx;
      for(const [x,y] of this.near()) if(this.solid(x,y)&&overlap(this.p,x,y)){
        this.p.x=dx>0?x*CELL-HALF:(x+1)*CELL+HALF; this.v.x=0;
      }
    }
    if(dy){
      this.grounded=false; this.p.y+=dy;
      for(const [x,y] of this.near()) if(this.solid(x,y)&&overlap(this.p,x,y)){
        if(dy>0){ this.p.y=y*CELL-HALF; this.grounded=true; } else this.p.y=(y+1)*CELL+HALF;
        this.v.y=0;
      }
    }
  }

  private solveRope(){
    if(!this.anchor) return;
    const dx=this.p.x-this.anchor.x, dy=this.p.y-this.anchor.y, d=Math.hypot(dx,dy); if(d<=this.rope||d<.001) return;
    const nx=dx/d, ny=dy/d; this.p={x:this.anchor.x+nx*this.rope,y:this.anchor.y+ny*this.rope};
    const radial=this.v.x*nx+this.v.y*ny; if(radial>0){ this.v.x-=radial*nx; this.v.y-=radial*ny; }
  }

  private hook(){
    const aim={x:this.input.aim.x+this.cam.x,y:this.input.aim.y+this.cam.y}; let best:V|null=null, score=1e9;
    for(const a of this.world.anchors){
      const pd=dist(this.p,a); if(pd>HOOK_RANGE) continue;
      const dot=dirDot(a.x-this.p.x,a.y-this.p.y,aim.x-this.p.x,aim.y-this.p.y); if(dot<.15) continue;
      const s=dist(aim,a)*.85+pd*.15+(1-dot)*145; if(s<score){score=s;best=a;}
    }
    if(best){ this.anchor=best; this.rope=Math.max(42,dist(this.p,best)); }
  }

  private bubble(){
    const a={x:this.input.aim.x+this.cam.x,y:this.input.aim.y+this.cam.y}; let dx=a.x-this.p.x,dy=a.y-this.p.y,d=Math.hypot(dx,dy);
    if(d<15){dx=0;dy=1;d=1;} dx/=d;dy/=d;
    this.v.x-=dx*215; this.v.y-=dy*345; this.bubblePos={x:this.p.x+dx*14,y:this.p.y+dy*14}; this.bubbleFx=.24; this.bubbleReady=false;
  }

  private die(){ this.deaths++; this.anchor=null; this.p={...this.spawn}; this.v={x:0,y:0}; this.bubbleReady=true; }

  private hit(tile:string){
    for(const [x,y] of this.near()) if(this.at(x,y)===tile&&overlap(this.p,x,y,3,5)) return true; return false;
  }
  private near(){
    const out:[number,number][]=[]; const x=Math.floor(this.p.x/CELL),y=Math.floor(this.p.y/CELL);
    for(let yy=y-1;yy<=y+1;yy++) for(let xx=x-1;xx<=x+1;xx++) out.push([xx,yy]); return out;
  }
  private at(x:number,y:number){ return x<0||y<0||x>=this.world.w||y>=this.world.h?'#':this.world.grid[y][x]; }
  private solid(x:number,y:number){ return this.at(x,y)==='#'; }

  private draw(){
    const g=this.ctx; g.setTransform(this.dpr,0,0,this.dpr,0,0); g.fillStyle=C.bg; g.fillRect(0,0,this.view.x,this.view.y); this.drawStars(g);
    g.save(); g.translate(-Math.round(this.cam.x),-Math.round(this.cam.y)); this.drawWorld(g); this.drawRope(g); this.drawBubble(g); this.glyph(g,'@',this.p,C.player,true); g.restore();
    this.drawAim(g); this.drawHud(g); if(this.clearTimer>0){g.font='bold 20px monospace';g.textAlign='center';g.fillStyle=C.player;g.fillText('CLEAR',this.view.x/2,this.view.y/2);}
  }

  private drawWorld(g:CanvasRenderingContext2D){
    g.font=`bold ${CELL}px ui-monospace,Menlo,Consolas,monospace`; g.textAlign='center'; g.textBaseline='middle';
    const x0=Math.max(0,Math.floor(this.cam.x/CELL)-1),x1=Math.min(this.world.w-1,Math.ceil((this.cam.x+this.view.x)/CELL)+1);
    const y0=Math.max(0,Math.floor(this.cam.y/CELL)-1),y1=Math.min(this.world.h-1,Math.ceil((this.cam.y+this.view.y)/CELL)+1);
    for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){
      const t=this.at(x,y),p={x:x*CELL+CELL/2,y:y*CELL+CELL/2+1};
      if(t==='#') this.glyph(g,'#',p,(x+y)%2?C.wall:C.wall2);
      else if(t==='o') this.glyph(g,'O',p,C.anchor);
      else if(t==='^') this.glyph(g,'^',p,C.hazard);
      else if(t==='!') this.glyph(g,'!',p,C.checkpoint);
      else if(t==='E') this.glyph(g,'E',p,C.exit);
    }
  }

  private drawRope(g:CanvasRenderingContext2D){
    if(!this.anchor)return; const n=Math.max(2,Math.floor(dist(this.p,this.anchor)/10)); g.font='11px monospace';g.fillStyle=C.rope;
    for(let i=1;i<n;i++){const t=i/n;g.fillText(i%2?'·':'-',this.p.x+(this.anchor.x-this.p.x)*t,this.p.y+(this.anchor.y-this.p.y)*t);}
  }
  private drawBubble(g:CanvasRenderingContext2D){
    if(this.bubbleFx<=0)return; const q=this.bubbleFx/.24; g.font=`bold ${CELL}px monospace`;g.fillStyle=C.bubble;g.fillText('□',this.bubblePos.x,this.bubblePos.y+(1-q)*12);
  }
  private glyph(g:CanvasRenderingContext2D,ch:string,p:V,color:string,glow=false){
    g.fillStyle=color; if(glow){g.shadowColor=color;g.shadowBlur=7;} g.fillText(ch,p.x,p.y); if(glow)g.shadowBlur=0;
  }
  private drawAim(g:CanvasRenderingContext2D){
    const a=this.input.aim;g.strokeStyle=C.aim;g.beginPath();g.moveTo(a.x-5,a.y);g.lineTo(a.x+5,a.y);g.moveTo(a.x,a.y-5);g.lineTo(a.x,a.y+5);g.stroke();
  }
  private drawHud(g:CanvasRenderingContext2D){
    g.font='bold 13px monospace';g.textBaseline='top';g.textAlign='left';g.fillStyle=C.ui;g.fillText(`↔ A/D   ↑ jump   ${this.anchor?'[hook]':' hook '}  ${this.bubbleReady?' bubble ':' ...... '}`,14,12);
    g.textAlign='right';g.fillStyle=C.dim;g.fillText(`${this.world.name}  ${((performance.now()-this.started)/1000).toFixed(1)}s  ×${this.deaths}`,this.view.x-14,12);
  }
  private drawStars(g:CanvasRenderingContext2D){g.font='12px monospace';g.fillStyle=C.star;for(const s of this.stars)g.fillText('.',mod(s.x-this.cam.x*.08,this.view.x+30)-15,mod(s.y-this.cam.y*.08,this.view.y+30)-15);}

  private load(i:number){
    this.level=i; const src=LEVELS[i],h=src.rows.length,w=Math.max(...src.rows.map(r=>r.length)),grid=src.rows.map(r=>r.padEnd(w,'.').split(''));
    let start:V|undefined,exit:V|undefined;const anchors:V[]=[],checkpoints:V[]=[];
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const t=grid[y][x],p={x:x*CELL+CELL/2,y:y*CELL+CELL/2};if(t==='@')start=p;if(t==='E')exit=p;if(t==='o')anchors.push(p);if(t==='!')checkpoints.push(p);}
    if(!start||!exit)throw new Error('Level needs @ and E');this.world={grid,w,h,start,exit,anchors,checkpoints,name:src.name};this.spawn={...start};this.p={...start};this.v={x:0,y:0};this.anchor=null;this.bubbleReady=true;
  }

  private makeStars(){let s=0x47594c50;const r=()=>((s=(s*1664525+1013904223)>>>0)/0xffffffff);return Array.from({length:100},()=>({x:r()*1600,y:r()*900}));}
  private resize(){const r=this.canvas.getBoundingClientRect();this.view={x:Math.max(320,r.width),y:Math.max(240,r.height)};this.dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(this.view.x*this.dpr);this.canvas.height=Math.round(this.view.y*this.dpr);if(!this.input.aimed)this.input.aim={x:this.view.x*.66,y:this.view.y*.38};}

  private bind(){
    const keys=new Map<string,Action>([['KeyA','left'],['ArrowLeft','left'],['KeyD','right'],['ArrowRight','right'],['Space','jump'],['KeyZ','jump'],['KeyX','hook'],['ShiftLeft','hook'],['ShiftRight','hook'],['KeyC','bubble'],['KeyW','in'],['ArrowUp','in'],['KeyS','out'],['ArrowDown','out']]);
    addEventListener('keydown',e=>{const a=keys.get(e.code);if(a){e.preventDefault();this.input.set(a,true);}}, {passive:false});
    addEventListener('keyup',e=>{const a=keys.get(e.code);if(a){e.preventDefault();this.input.set(a,false);}}, {passive:false});
    const aim=(e:PointerEvent)=>{const r=this.canvas.getBoundingClientRect();this.input.aim={x:e.clientX-r.left,y:e.clientY-r.top};this.input.aimed=true;};
    this.canvas.addEventListener('pointermove',aim);this.canvas.addEventListener('pointerdown',e=>{aim(e);if(e.pointerType==='mouse'&&e.button===0)this.input.set('hook',true);});
    addEventListener('pointerup',e=>{if(e.pointerType==='mouse'&&e.button===0)this.input.set('hook',false);});this.canvas.addEventListener('contextmenu',e=>e.preventDefault());
    document.querySelectorAll<HTMLButtonElement>('[data-control]').forEach(b=>{const a=b.dataset.control as 'left'|'right'|'jump'|'hook'|'bubble';const on=(e:PointerEvent)=>{e.preventDefault();b.setPointerCapture(e.pointerId);this.input.set(a,true);};const off=(e:PointerEvent)=>{e.preventDefault();this.input.set(a,false);};b.addEventListener('pointerdown',on);b.addEventListener('pointerup',off);b.addEventListener('pointercancel',off);b.addEventListener('lostpointercapture',()=>this.input.set(a,false));});
  }
}

function approach(v:number,t:number,d:number){return v<t?Math.min(t,v+d):v>t?Math.max(t,v-d):v;}
function clamp(v:number,a:number,b:number){return Math.max(a,Math.min(b,v));}
function dist(a:V,b:V){return Math.hypot(a.x-b.x,a.y-b.y);}
function mod(v:number,m:number){return((v%m)+m)%m;}
function dirDot(ax:number,ay:number,bx:number,by:number){const a=Math.hypot(ax,ay),b=Math.hypot(bx,by);return a&&b?(ax*bx+ay*by)/(a*b):1;}
function overlap(p:V,x:number,y:number,pad=0,top=0){const l=p.x-HALF,r=p.x+HALF,t=p.y-HALF,b=p.y+HALF,tx=x*CELL+pad,ty=y*CELL+top,tw=CELL-pad*2,th=CELL-top;return l<tx+tw&&r>tx&&t<ty+th&&b>ty;}
