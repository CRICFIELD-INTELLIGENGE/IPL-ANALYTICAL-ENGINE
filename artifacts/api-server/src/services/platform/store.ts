import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
export type EventKind = "wicket" | "match_result" | "auction_purchase" | "player_update" | "daily_digest";
export type Channel = "in_app" | "email" | "whatsapp";
export interface CricketEvent { id: string; kind: EventKind; title: string; body: string; source: string; occurredAt: number }
export class PlatformStore {
  db: DatabaseSync;
  constructor(file: string) {
    if(file!==":memory:")fs.mkdirSync(path.dirname(file),{recursive:true});
    this.db=new DatabaseSync(file);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS preferences(user_id TEXT PRIMARY KEY,email TEXT NOT NULL,topics TEXT NOT NULL,channels TEXT NOT NULL,phone TEXT,phone_verified INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,consent_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,kind TEXT NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL,source TEXT NOT NULL,occurred_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS deliveries(id TEXT PRIMARY KEY,event_id TEXT NOT NULL,user_id TEXT NOT NULL,channel TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,next_at INTEGER NOT NULL,lease_until INTEGER NOT NULL DEFAULT 0,error TEXT,read_at INTEGER, UNIQUE(event_id,user_id,channel));
      CREATE INDEX IF NOT EXISTS delivery_queue ON deliveries(status,next_at);
      CREATE TABLE IF NOT EXISTS delivery_log(id INTEGER PRIMARY KEY,delivery_id TEXT,state TEXT,at INTEGER);
      CREATE TABLE IF NOT EXISTS checkpoints(key TEXT PRIMARY KEY,value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS analytics_events(id INTEGER PRIMARY KEY,session TEXT NOT NULL,feature TEXT NOT NULL,action TEXT NOT NULL,at INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS analytics_time ON analytics_events(at);
      CREATE TABLE IF NOT EXISTS presence(session TEXT PRIMARY KEY,last_seen INTEGER NOT NULL);
    `);
    if (!(this.db.prepare('PRAGMA table_info(preferences)').all() as any[]).some(column=>column.name==='consent_at')) this.db.exec('ALTER TABLE preferences ADD COLUMN consent_at INTEGER NOT NULL DEFAULT 0');
  }
  transaction<T>(run:()=>T):T {this.db.exec('BEGIN IMMEDIATE');try{const result=run();this.db.exec('COMMIT');return result;}catch(error){this.db.exec('ROLLBACK');throw error;}}
  preferences(userId:string){const row=this.db.prepare('SELECT * FROM preferences WHERE user_id=?').get(userId) as any;return row?{...row,topics:JSON.parse(row.topics),channels:JSON.parse(row.channels)}:null;}
  subscribe(userId:string,email:string,topics:string[],channels:string[],phone?:string){
    const previous=this.preferences(userId);
    this.db.prepare(`INSERT INTO preferences(user_id,email,topics,channels,phone,phone_verified,created_at,consent_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET email=excluded.email,topics=excluded.topics,channels=excluded.channels,phone=excluded.phone,phone_verified=excluded.phone_verified,consent_at=excluded.consent_at`).run(userId,email,JSON.stringify(topics),JSON.stringify(channels),phone??null,previous && previous.phone===phone?previous.phone_verified:0,Date.now(),Date.now());
  }
  event(event:CricketEvent){return this.transaction(()=>{
    const inserted=this.db.prepare('INSERT OR IGNORE INTO events VALUES(?,?,?,?,?,?)').run(event.id,event.kind,event.title,event.body,event.source,event.occurredAt);
    if(!Number(inserted.changes))return false;
    const users=this.db.prepare('SELECT user_id,topics,channels,created_at FROM preferences').all() as any[];
    for(const user of users){if(user.created_at>event.occurredAt || !JSON.parse(user.topics).includes(event.kind))continue;
      for(const channel of JSON.parse(user.channels))this.db.prepare('INSERT OR IGNORE INTO deliveries(id,event_id,user_id,channel,next_at) VALUES(?,?,?,?,?)').run(randomUUID(),event.id,user.user_id,channel,Date.now());
    }return true;
  });}
  inbox(userId:string){return this.db.prepare(`SELECT d.id,d.read_at,e.kind,e.title,e.body,e.source,e.occurred_at FROM deliveries d JOIN events e ON e.id=d.event_id WHERE d.user_id=? AND d.channel='in_app' AND d.status='sent' ORDER BY e.occurred_at DESC LIMIT 50`).all(userId);}
  read(userId:string,id:string){this.db.prepare("UPDATE deliveries SET read_at=? WHERE id=? AND user_id=? AND channel='in_app'").run(Date.now(),id,userId);}
  claim(now=Date.now()){return this.transaction(()=>{
    // Email retries use provider idempotency. Ambiguous WhatsApp sends are quarantined.
    this.db.prepare("UPDATE deliveries SET status=CASE WHEN channel='whatsapp' THEN 'uncertain' ELSE 'pending' END WHERE status='processing' AND lease_until<?").run(now);
    const row=this.db.prepare("SELECT * FROM deliveries WHERE status IN ('pending','retry','blocked') AND next_at<=? ORDER BY next_at LIMIT 1").get(now) as any;
    if(!row)return null;
    this.db.prepare("UPDATE deliveries SET status='processing',lease_until=? WHERE id=?").run(now+120000,row.id);
    return {...row,event:this.db.prepare('SELECT * FROM events WHERE id=?').get(row.event_id),preference:this.preferences(row.user_id)};
  });}
  finish(id:string,state:string,error:string|null=null){const now=Date.now();const row=this.db.prepare('SELECT attempts FROM deliveries WHERE id=?').get(id) as any;
    const attempts=Number(row?.attempts??0)+(state==='blocked'?0:1);
    if(state==='retry' && attempts>=5)state='dead';
    this.transaction(()=>{this.db.prepare('UPDATE deliveries SET status=?,attempts=?,next_at=?,lease_until=0,error=? WHERE id=?').run(state,attempts,now+(state==='blocked'?300000:Math.min(3600000,1000*2**attempts)),error,id);this.db.prepare('INSERT INTO delivery_log(delivery_id,state,at) VALUES(?,?,?)').run(id,state,now);});
  }
  checkpoint(key:string,value?:string){if(value!==undefined)this.db.prepare('INSERT INTO checkpoints VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key,value);return (this.db.prepare('SELECT value FROM checkpoints WHERE key=?').get(key) as any)?.value as string|undefined;}
  track(session:string,feature:string,action:string,now=Date.now()){
    const hash=createHash('sha256').update(new Date(now).toISOString().slice(0,10)+session).digest('hex');
    this.transaction(()=>{this.db.prepare('INSERT INTO presence VALUES(?,?) ON CONFLICT(session) DO UPDATE SET last_seen=excluded.last_seen').run(hash,now);
      if(action!=='heartbeat')this.db.prepare('INSERT INTO analytics_events(session,feature,action,at) VALUES(?,?,?,?)').run(hash,feature,action,now);
      this.db.prepare('DELETE FROM presence WHERE last_seen<?').run(now-120000);this.db.prepare('DELETE FROM analytics_events WHERE at<?').run(now-30*86400000);
    });
  }
  metrics(){const now=Date.now();this.db.prepare('DELETE FROM analytics_events WHERE at<?').run(now-30*86400000);this.db.prepare('DELETE FROM presence WHERE last_seen<?').run(now-120000);return {onlineOptIn:Number((this.db.prepare('SELECT count(*) n FROM presence WHERE last_seen>?').get(now-90000) as any).n),pageViews30d:Number((this.db.prepare("SELECT count(*) n FROM analytics_events WHERE action='page_view' AND at>?").get(now-30*86400000) as any).n),measuredAt:new Date(now).toISOString()};}
  admin(){const cutoff=Date.now()-30*86400000;return {...this.metrics(),daily:this.db.prepare("SELECT strftime('%Y-%m-%d',at/1000,'unixepoch') day,count(*) pageViews,count(DISTINCT session) browserSessions FROM analytics_events WHERE action='page_view' AND at>? GROUP BY day ORDER BY day").all(cutoff),topPages:this.db.prepare("SELECT feature page,count(*) pageViews FROM analytics_events WHERE action='page_view' AND at>? GROUP BY feature ORDER BY pageViews DESC").all(cutoff),features:this.db.prepare('SELECT feature,action,count(*) count FROM analytics_events WHERE at>? GROUP BY feature,action').all(Date.now()-30*86400000),queue:this.db.prepare('SELECT channel,status,count(*) count FROM deliveries GROUP BY channel,status').all(),logs:this.db.prepare('SELECT delivery_id,state,at FROM delivery_log ORDER BY id DESC LIMIT 100').all()};}
}
let singleton:PlatformStore|undefined;
export function platform(){return singleton??=new PlatformStore(process.env.PLATFORM_DB_PATH || path.resolve(process.cwd(),'data','platform.sqlite'));}
