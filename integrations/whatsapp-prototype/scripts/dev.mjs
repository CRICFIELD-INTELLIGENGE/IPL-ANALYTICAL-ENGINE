import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.resolve(project,'../..');
const api=path.join(root,'artifacts','api-server');
const children=[];
function start(args,cwd,env=process.env){const child=spawn(process.execPath,args,{cwd,env,stdio:'inherit',windowsHide:true});children.push(child);child.on('error',()=>console.error('Could not launch a local service.'));}
try{await fetch('http://127.0.0.1:5055/api/healthz',{signal:AbortSignal.timeout(2000)});console.log('Reusing local API on port 5055.');}
catch{const require=createRequire(path.join(api,'package.json'));start([require.resolve('tsx/cli'),'src/index.ts'],api,{...process.env,PORT:'5055',CRICFIELD_DB_READONLY:'1'});}
const file=path.join(root,'env','whatsapp.env');
if(fs.existsSync(file))process.loadEnvFile(file);
if(['META_APP_SECRET','META_VERIFY_TOKEN','META_PHONE_NUMBER_ID'].every(name=>process.env[name]?.trim()))start(['src/server.mjs'],project);
else console.log('CricField API launched. Fill env/whatsapp.env to enable the webhook, then run npm run dev again.');
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{children.forEach(child=>child.kill());process.exit();});
