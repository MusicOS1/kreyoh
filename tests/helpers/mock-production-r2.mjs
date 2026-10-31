import http from 'node:http';import {createHash} from 'node:crypto';
export function mockProductionR2(){
 const transfers=new Map(),objects=new Map(),requests=[];let failPart=0;
 const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');const key=decodeURIComponent(url.pathname);const upload=url.searchParams.get('uploadId');
  const xml=(body,status=200)=>{res.writeHead(status,{'Content-Type':'application/xml'});res.end(body);};
  res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','*');res.setHeader('Access-Control-Expose-Headers','ETag');
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  requests.push({method:req.method,key,upload,part:url.searchParams.get('partNumber')});
  if(req.method==='POST'&&url.searchParams.has('uploads')){
   const id=crypto.randomUUID();transfers.set(id,{key,type:req.headers['content-type'],parts:new Map()});return xml(`<InitiateMultipartUploadResult><Bucket>fixture</Bucket><Key>${key}</Key><UploadId>${id}</UploadId></InitiateMultipartUploadResult>`);
  }
  const transfer=transfers.get(upload);
  if(req.method==='PUT'&&req.headers['x-amz-copy-source']){
   const source=objects.get('/'+decodeURIComponent(String(req.headers['x-amz-copy-source'])).replace(/^\//,''));
   if(!source)return xml('<Error><Code>NoSuchKey</Code></Error>',404);
   if(transfer){const range=/bytes=(\d+)-(\d+)/.exec(req.headers['x-amz-copy-source-range']||'');if(!range)return xml('<Error><Code>InvalidRange</Code></Error>',400);const number=Number(url.searchParams.get('partNumber')),size=Number(range[2])-Number(range[1])+1,etag='"copy-'+number+'"';transfer.parts.set(number,{size,etag});return xml(`<CopyPartResult><ETag>${etag}</ETag></CopyPartResult>`);}
   objects.set(key,{...source});return xml(`<CopyObjectResult><ETag>${source.etag}</ETag></CopyObjectResult>`);
  }
  if(req.method==='PUT'&&transfer){
   const number=Number(url.searchParams.get('partNumber'));const hash=createHash('md5');let size=0;for await(const chunk of req){size+=chunk.length;hash.update(chunk);}
   if(size>0&&url.searchParams.get('x-amz-checksum-crc32')==='AAAAAA==')return xml('<Error><Code>BadDigest</Code></Error>',400);
   if(failPart===number){failPart=0;return xml('<Error><Code>InternalError</Code></Error>',503);}
   const etag='"'+hash.digest('hex')+'"';transfer.parts.set(number,{size,etag});res.setHeader('ETag',etag);res.writeHead(200);return res.end();
  }
  if(req.method==='GET'&&transfer)return xml(`<ListPartsResult><Bucket>fixture</Bucket><Key>${key}</Key><UploadId>${upload}</UploadId><IsTruncated>false</IsTruncated>${[...transfer.parts].sort((a,b)=>a[0]-b[0]).map(([number,p])=>`<Part><PartNumber>${number}</PartNumber><ETag>${p.etag}</ETag><Size>${p.size}</Size></Part>`).join('')}</ListPartsResult>`);
  if(req.method==='POST'&&transfer){for await(const chunk of req){}const size=[...transfer.parts.values()].reduce((n,p)=>n+p.size,0);const etag='"fixture-completed-'+transfer.parts.size+'"';objects.set(key,{size,type:transfer.type,etag,partDigests:[...transfer.parts].map(([number,p])=>({number,...p}))});transfers.delete(upload);return xml(`<CompleteMultipartUploadResult><Location>fixture</Location><Bucket>fixture</Bucket><Key>${key}</Key><ETag>${etag}</ETag></CompleteMultipartUploadResult>`);}
  if(req.method==='DELETE'&&transfer){transfers.delete(upload);res.writeHead(204);return res.end();}
  const object=objects.get(key);
  if(req.method==='GET'&&object?.bytes){const match=/bytes=(\d+)-(\d*)/.exec(req.headers.range||'');const start=match?Number(match[1]):0,end=match&&match[2]?Math.min(Number(match[2]),object.bytes.length-1):object.bytes.length-1;const body=object.bytes.subarray(start,end+1);res.writeHead(match?206:200,{'Content-Type':object.type,'Content-Length':body.length,'Accept-Ranges':'bytes',...(match?{'Content-Range':`bytes ${start}-${end}/${object.bytes.length}`}:{})});return res.end(body);}
  if(req.method==='HEAD'&&object){res.writeHead(200,{'Content-Length':object.size,'Content-Type':object.type,'ETag':object.etag});return res.end();}
  return xml('<Error><Code>NoSuchKey</Code></Error>',404);
 });
 return {server,transfers,objects,requests,seed(key,type,bytes){objects.set('/fixture/'+key,{bytes,size:bytes.length,type,etag:'\"fixture-seed\"'});},failNextPart(number){failPart=number;}};
}

export function wavHeader(bytes){const header=Buffer.alloc(44);header.write('RIFF',0);header.writeUInt32LE(bytes+36,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(8000,24);header.writeUInt32LE(16000,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(bytes,40);return header;}
