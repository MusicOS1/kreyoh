// Isolated test process only. Redirect exactly the synthetic R2 host to the local S3 fixture.
// Application code has no mock mode or storage bypass.
const https=require('node:https'),http=require('node:http');const original=https.request;
https.request=function(input,options,callback){
 let config;
 if(typeof input==='string'||input instanceof URL){const url=new URL(input);config={protocol:url.protocol,hostname:url.hostname,path:url.pathname+url.search,...(typeof options==='object'?options:{})};callback=typeof options==='function'?options:callback;}
 else{config={...input};callback=options;}
 config.hostname=config.hostname||config.host;
 if(['fixture.00000000000000000000000000000000.r2.cloudflarestorage.com','00000000000000000000000000000000.r2.cloudflarestorage.com'].includes(config.hostname))return http.request({...config,path:(config.hostname.startsWith('fixture.')?'/fixture':'')+config.path,protocol:'http:',hostname:'127.0.0.1',host:'127.0.0.1',port:54330,agent:undefined},callback);
 return original.call(this,input,options,callback);
};
