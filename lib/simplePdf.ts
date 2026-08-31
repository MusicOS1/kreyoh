function clean(value: string) {
  return value.normalize("NFKD").replace(/[^\x20-\x7E]/g, " ").replace(/\s+/g, " ").trim();
}
function escapePdf(value: string) {
  return clean(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}
function wrap(value: string, width = 86) {
  const words = clean(value).split(" ").filter(Boolean);
  if (!words.length) return [""];
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > width && line) { lines.push(line); line = word; }
    else line = next;
  }
  if (line) lines.push(line);
  return lines;
}
export function buildSimplePdf(title: string, sections: {heading: string; lines: string[]}[]) {
  const rows: {text:string;size:number;gap:number}[] = [
    { text: title, size: 18, gap: 10 },
    { text: `Generated ${new Date().toLocaleString("en-KE")}`, size: 9, gap: 16 },
  ];
  for (const section of sections) {
    rows.push({ text: section.heading.toUpperCase(), size: 12, gap: 5 });
    for (const line of section.lines) for (const w of wrap(line)) rows.push({text:w,size:9.5,gap:0});
    rows.push({text:"",size:9,gap:8});
  }
  const pages: typeof rows[] = []; let page: typeof rows = []; let used = 0;
  for (const row of rows) {
    const h = row.size + 4 + row.gap;
    if (used + h > 720 && page.length) { pages.push(page); page=[]; used=0; }
    page.push(row); used += h;
  }
  if (page.length) pages.push(page);

  const objects: string[] = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  let next = 4; const pageNums:number[]=[]; const contentNums:number[]=[];
  pages.forEach(()=>{ pageNums.push(next++); contentNums.push(next++); });
  objects[2] = `<< /Type /Pages /Kids [${pageNums.map(n=>`${n} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  pages.forEach((rows, i) => {
    let y=792; const cmd=["BT"];
    for (const row of rows) {
      cmd.push(`/F1 ${row.size} Tf`, `1 0 0 1 50 ${y.toFixed(2)} Tm`, `(${escapePdf(row.text)}) Tj`);
      y -= row.size + 4 + row.gap;
    }
    cmd.push("ET"); const stream=cmd.join("\n");
    objects[pageNums[i]] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentNums[i]} 0 R >>`;
    objects[contentNums[i]] = `<< /Length ${Buffer.byteLength(stream,"latin1")} >>\nstream\n${stream}\nendstream`;
  });
  let output="%PDF-1.4\n"; const offsets:number[]=[0]; const max=objects.length-1;
  for(let i=1;i<=max;i++){ offsets[i]=Buffer.byteLength(output,"latin1"); output+=`${i} 0 obj\n${objects[i]}\nendobj\n`; }
  const xref=Buffer.byteLength(output,"latin1");
  output+=`xref\n0 ${max+1}\n0000000000 65535 f \n`;
  for(let i=1;i<=max;i++) output+=`${String(offsets[i]).padStart(10,"0")} 00000 n \n`;
  output+=`trailer\n<< /Size ${max+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(output,"latin1");
}
