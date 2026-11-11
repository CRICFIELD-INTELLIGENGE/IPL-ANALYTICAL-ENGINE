import { appendFileSync, mkdirSync } from 'node:fs';
import { createBridge,settings } from './bridge.mjs';
const config=settings();
mkdirSync('data',{recursive:true});
const bridge=createBridge(config,{record:event=>appendFileSync('data/delivery.jsonl',JSON.stringify(event)+'\n')});
const port=Number(process.env.WHATSAPP_PORT || 5090);
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Invalid port');
bridge.server.listen(port,'127.0.0.1',()=>console.log(`CricField WhatsApp prototype: http://127.0.0.1:${port} (${config.dryRun?'dry-run; no messages sent':'allowlisted test replies enabled'})`));
