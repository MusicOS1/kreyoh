"use client";
import {useRef} from "react";
import {imageCropStyle} from "../lib/heroImageCrop";

type Props={
 image:string;
 x:number;y:number;zoom:number;
 onChange:(value:{imageX:number;imageY:number;imageZoom:number})=>void;
 label?:string;
};
export default function HeroImagePositioner({image,x,y,zoom,onChange,label="Hero image position"}:Props){
 const drag=useRef<{pointerId:number;clientX:number;clientY:number;startX:number;startY:number;width:number;height:number}|null>(null);
 const update=(field:"imageX"|"imageY"|"imageZoom",value:number)=>{
  onChange({imageX:field==="imageX"?value:x,imageY:field==="imageY"?value:y,
   imageZoom:field==="imageZoom"?value:zoom});
 };
 return <section className="fm-artwork-positioner" aria-label={label}>
  <div className="fm-artwork-positioner-heading"><strong>{label}</strong>
   <span>Drag the picture to shift its focal point. Fine-tune below.</span></div>
  <div className="fm-artwork-positioner-preview"
   onPointerDown={e=>{
    if(!image||e.button!==0)return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect=e.currentTarget.getBoundingClientRect();
    drag.current={pointerId:e.pointerId,clientX:e.clientX,clientY:e.clientY,
     startX:x,startY:y,width:Math.max(1,rect.width),height:Math.max(1,rect.height)};
   }}
   onPointerMove={e=>{
    const start=drag.current;
    if(!start||start.pointerId!==e.pointerId)return;
    const nextX=Math.round(Math.max(0,Math.min(100,start.startX-(e.clientX-start.clientX)*100/start.width)));
    const nextY=Math.round(Math.max(0,Math.min(100,start.startY-(e.clientY-start.clientY)*100/start.height)));
    onChange({imageX:nextX,imageY:nextY,imageZoom:zoom});
   }}
   onPointerUp={()=>{drag.current=null;}}
   onPointerCancel={()=>{drag.current=null;}}
   role="img" aria-label={image?"Position preview of selected hero image":"Upload a hero image to position it"}>
   {image?<img src={image} alt="" draggable={false} style={imageCropStyle({imageX:x,imageY:y,imageZoom:zoom})}/>:
    <span className="fm-artwork-positioner-empty">Upload artwork to preview its position</span>}
   <span className="fm-artwork-positioner-grid" aria-hidden="true"/>
  </div>
  <div className="fm-artwork-positioner-sliders">
   <label>Horizontal <span>{x}%</span><input type="range" min="0" max="100" step="1" value={x}
    onChange={e=>update("imageX",Number(e.target.value))}/></label>
   <label>Vertical <span>{y}%</span><input type="range" min="0" max="100" step="1" value={y}
    onChange={e=>update("imageY",Number(e.target.value))}/></label>
   <label>Zoom <span>{zoom}%</span><input type="range" min="100" max="180" step="1" value={zoom}
    onChange={e=>update("imageZoom",Number(e.target.value))}/></label>
  </div>
  <button className="fm-artwork-reset" type="button" onClick={()=>onChange({imageX:50,imageY:50,imageZoom:100})}>
   Reset positioning
  </button>
 </section>;
}
