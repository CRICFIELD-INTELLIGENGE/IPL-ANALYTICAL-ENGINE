import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const file=path.join(root,'env','whatsapp.env');
if(fs.existsSync(file))process.loadEnvFile(file);
const required=['META_APP_SECRET','META_VERIFY_TOKEN','META_PHONE_NUMBER_ID','WHATSAPP_TEST_RECIPIENTS'];
const missing=required.filter(name=>!process.env[name]?.trim());
console.log(missing.length?`Needs configuration: ${missing.join(', ')}`:'Webhook configuration present (credentials not verified).');
for(const [name,url] of [['Ollama','http://127.0.0.1:11434/api/tags'],['CricField','http://127.0.0.1:5055/api/healthz']]){
 try{const result=await fetch(url,{signal:AbortSignal.timeout(3000)});console.log(`${name}: HTTP ${result.status}`);}catch{console.log(`${name}: not reachable; run npm run dev to start CricField.`);}
}
console.log('Live WhatsApp sends: '+(process.env.WHATSAPP_SEND_ENABLED==='true'?'enabled for allowlisted tests':'disabled (dry-run)'));
