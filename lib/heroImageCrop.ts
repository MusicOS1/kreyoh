/** Stable, bounded crop coordinates for public editorial artwork. */
export type ImageFocalPoint={imageX:number;imageY:number;imageZoom:number};
export const imagePositionDefaults:ImageFocalPoint={imageX:50,imageY:50,imageZoom:100};
export function imageCropValue(value:unknown,min:number,max:number,fallback:number){
 const number=typeof value==="number"?value:
  typeof value==="string"&&value.trim()!==""?Number(value):NaN;
 return Number.isFinite(number)?Math.min(max,Math.max(min,Math.round(number))):fallback;
}
export function normalizeImageCrop(values:Partial<Record<keyof ImageFocalPoint,unknown>>):ImageFocalPoint{
 return {
  imageX:imageCropValue(values.imageX,0,100,50),
  imageY:imageCropValue(values.imageY,0,100,50),
  imageZoom:imageCropValue(values.imageZoom,100,180,100)
 };
}
export function imageCropStyle(values:Partial<ImageFocalPoint>){
 const {imageX,imageY,imageZoom}=normalizeImageCrop(values);
 return {objectPosition:`${imageX}% ${imageY}%`,transform:`scale(${imageZoom/100})`};
}
