type RGB=[number,number,number];
const W=595,H=842,C={ink:[.035,.035,.04] as RGB,orange:[.976,.451,.086] as RGB,cream:[.973,.957,.925] as RGB,white:[1,1,1] as RGB,muted:[.46,.46,.49] as RGB,line:[.87,.87,.88] as RGB,light:[.965,.965,.97] as RGB};
const clean=(v:unknown)=>String(v??"").normalize("NFKD").replace(/[^\x20-\x7E]/g," ").replace(/\s+/g," ").trim();
const esc=(v:unknown)=>clean(v).replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)");
const rgb=(c:RGB)=>`${c[0]} ${c[1]} ${c[2]}`;
function wrap(v:unknown,n=82){const words=clean(v).split(" ").filter(Boolean),out:string[]=[];let line="";for(const word of words){const next=line?`${line} ${word}`:word;if(next.length>n&&line){out.push(line);line=word}else line=next}if(line)out.push(line);return out.length?out:[""];}

class Page{
 commands:string[]=[];cursor=116;
 constructor(public number:number,project:string,code:string){this.rect(0,0,W,76,C.ink);this.rect(0,76,W,5,C.orange);this.text("FACKTS MUSIC",42,26,15,"F2",C.white);this.text(code.toUpperCase(),42,49,8.5,"F2",C.orange);this.text(project.slice(0,46),553,31,9,"F1",C.cream,"right");this.text(`PROJECT REPORT / ${String(number).padStart(2,"0")}`,553,50,7.5,"F1",C.muted,"right");}
 rect(x:number,top:number,w:number,h:number,c:RGB){this.commands.push(`${rgb(c)} rg ${x} ${H-top-h} ${w} ${h} re f`);}
 line(x1:number,t1:number,x2:number,t2:number,c:RGB,w=.7){this.commands.push(`${rgb(c)} RG ${w} w ${x1} ${H-t1} m ${x2} ${H-t2} l S`);}
 text(v:unknown,x:number,top:number,size:number,font="F1",c:RGB=C.ink,align:"left"|"right"="left"){const s=esc(v),xx=align==="right"?x-s.length*size*.5:x;this.commands.push(`BT /${font} ${size} Tf ${rgb(c)} rg 1 0 0 1 ${xx.toFixed(2)} ${(H-top-size).toFixed(2)} Tm (${s}) Tj ET`);}
 footer(code:string){this.line(42,805,553,805,C.line);this.text("FACKTS MUSIC / PROJECT INTELLIGENCE",42,815,6.8,"F2",C.muted);this.text(code,553,815,6.8,"F1",C.muted,"right");}
}

export function buildExecutiveProjectPdf(input:{projectName:string;projectCode:string;projectType?:string|null;status?:string|null;description?:string|null;nextAction?:string|null;generatedAt:string;metrics:{label:string;value:string;note?:string}[];executiveLines:string[];sections:{title:string;eyebrow?:string;lines:string[]}[];}){
 const pages:Page[]=[];const newPage=()=>{const p=new Page(pages.length+1,input.projectName,input.projectCode);pages.push(p);return p};let p=newPage();
 p.rect(42,108,511,166,C.ink);p.rect(42,108,7,166,C.orange);p.text("EXECUTIVE PROJECT REPORT",68,132,8.5,"F2",C.orange);p.text(input.projectName,68,157,28,"F2",C.white);p.text(`${input.projectType||"Music Project"} / ${(input.status||"active").toUpperCase()}`,68,198,9.5,"F2",C.cream);
 wrap(input.description||"No description recorded.",72).slice(0,3).forEach((line,i)=>p.text(line,68,222+i*15,9,"F1",C.muted));p.text("GENERATED",425,132,7,"F2",C.orange);p.text(input.generatedAt,425,149,8,"F1",C.cream);
 input.metrics.slice(0,6).forEach((m,i)=>{const col=i%3,row=Math.floor(i/3),x=42+col*174,top=304+row*83;p.rect(x,top,162,70,C.light);p.text(m.label.toUpperCase(),x+12,top+12,6.7,"F2",C.muted);p.text(m.value,x+12,top+29,18,"F2",C.ink);if(m.note)p.text(m.note,x+12,top+54,6.8,"F1",C.muted);});
 p.cursor=486;p.text("EXECUTIVE INTERPRETATION",42,p.cursor,8,"F2",C.orange);p.cursor+=22;
 input.executiveLines.slice(0,7).forEach(line=>{wrap(line,88).forEach((part,i)=>{p.text(i?`  ${part}`:`• ${part}`,48,p.cursor,9);p.cursor+=14});p.cursor+=3});
 p.cursor+=8;p.rect(42,p.cursor,511,70,C.cream);p.text("NEXT ACTION",58,p.cursor+13,7,"F2",C.orange);wrap(input.nextAction||"No next action recorded.",76).slice(0,3).forEach((line,i)=>p.text(line,58,p.cursor+32+i*14,10,i?"F1":"F2",C.ink));

 for(const s of input.sections){const need=58+s.lines.reduce((sum,line)=>sum+wrap(line,88).length*14+4,0);if(p.cursor+need>775){p.footer(input.projectCode);p=newPage()}p.cursor+=20;if(s.eyebrow){p.text(s.eyebrow.toUpperCase(),42,p.cursor,6.8,"F2",C.orange);p.cursor+=15}p.text(s.title,42,p.cursor,16,"F2");p.cursor+=27;p.line(42,p.cursor,553,p.cursor,C.line);p.cursor+=14;
  for(const line of s.lines){for(const [i,part] of wrap(line,88).entries()){p.text(i?`  ${part}`:`• ${part}`,48,p.cursor,9);p.cursor+=14}p.cursor+=3;if(p.cursor>770){p.footer(input.projectCode);p=newPage()}}
 }
 pages.forEach(pg=>pg.footer(input.projectCode));
 const objects:string[]=[];objects[1]="<< /Type /Catalog /Pages 2 0 R >>";objects[3]="<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";objects[4]="<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";let next=5;const pn:number[]=[],cn:number[]=[];pages.forEach(()=>{pn.push(next++);cn.push(next++)});objects[2]=`<< /Type /Pages /Kids [${pn.map(n=>`${n} 0 R`).join(" ")}] /Count ${pages.length} >>`;
 pages.forEach((pg,i)=>{const stream=pg.commands.join("\n");objects[pn[i]]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${cn[i]} 0 R >>`;objects[cn[i]]=`<< /Length ${Buffer.byteLength(stream,"latin1")} >>\nstream\n${stream}\nendstream`;});
 let output="%PDF-1.4\n";const offsets:number[]=[0],max=objects.length-1;for(let i=1;i<=max;i++){offsets[i]=Buffer.byteLength(output,"latin1");output+=`${i} 0 obj\n${objects[i]}\nendobj\n`}const xref=Buffer.byteLength(output,"latin1");output+=`xref\n0 ${max+1}\n0000000000 65535 f \n`;for(let i=1;i<=max;i++)output+=`${String(offsets[i]).padStart(10,"0")} 00000 n \n`;output+=`trailer\n<< /Size ${max+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;return Buffer.from(output,"latin1");
}
