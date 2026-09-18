import fs from 'node:fs';
import { PNG } from 'pngjs';
const p=PNG.sync.read(fs.readFileSync('arte-bruta/trajes/t02-couro/walk.png'));
const A=(x,y)=>p.data[(p.width*y+x)*4+3];
const col=[];for(let x=0;x<p.width;x++){let n=0;for(let y=0;y<p.height;y++)if(A(x,y)>40)n++;col.push(n);}
const g=[];let i=-1;
for(let x=0;x<p.width;x++){ if(col[x]>1){if(i<0)i=x;} else {if(i>=0&&x-i>14)g.push([i,x-1]);i=-1;} }
if(i>=0)g.push([i,p.width-1]);
const K=0.62, ALT=Math.round(p.height*K);
const larguras=g.map(([a,b])=>Math.round((b-a+1)*K));
const out=new PNG({width:larguras.reduce((s,w)=>s+w+8,8),height:ALT});
for(let k=0;k<out.data.length;k+=4){out.data[k]=22;out.data[k+1]=26;out.data[k+2]=34;out.data[k+3]=255;}
let X=8;
g.forEach(([a,b],idx)=>{
  const w=larguras[idx];
  for(let y=0;y<ALT;y++)for(let x=0;x<w;x++){
    const sx=a+Math.round(x/K), sy=Math.round(y/K);
    if(sx>b||sy>=p.height)continue;
    const s=(p.width*sy+sx)*4; const al=p.data[s+3]/255; if(al<0.05)continue;
    const d=(out.width*y+(X+x))*4;
    out.data[d]=Math.round(p.data[s]*al+out.data[d]*(1-al));
    out.data[d+1]=Math.round(p.data[s+1]*al+out.data[d+1]*(1-al));
    out.data[d+2]=Math.round(p.data[s+2]*al+out.data[d+2]*(1-al));
  }
  X+=w+8;
});
fs.writeFileSync('.zoom.png',PNG.sync.write(out));
console.log('quadros:',g.length);
