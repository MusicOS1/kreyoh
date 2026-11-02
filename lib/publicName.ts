/** Public identifiers are independent of legal names and project membership. */
export function cleanPublicName(value:string):string{
 return value.trim().replace(/\s+/g," ");
}
export function validatePublicName(value:string):string|null{
 const name=cleanPublicName(value);
 if(name.length<2||name.length>50)return "Use 2–50 characters for your public name.";
 if(!/^[\p{L}\p{N}][\p{L}\p{M}\p{N} ._'’&+-]*$/u.test(name))
  return "Use letters, numbers, spaces, dots, apostrophes, underscores or hyphens.";
 return null;
}
