import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const db = new DatabaseSync(process.env.CRICFIELD_DB_PATH || path.join(root, "sqlite.db"), { readOnly: true });
const out = process.env.VENUE_SNAPSHOT_OUT || path.join(root, "artifacts/ipl-analytics/public/data/venue-analytics");
fs.mkdirSync(out, { recursive: true });
const conditions = JSON.parse(fs.readFileSync(path.join(root, "artifacts/api-server/data/match-conditions.json"), "utf8"));
const normalize = (name) => {
 const n = name.toLowerCase();
 const rules = [["wankhede","Wankhede Stadium"],["eden garden","Eden Gardens"],["chidambaram","MA Chidambaram Stadium"],["chepauk","MA Chidambaram Stadium"],["chinnaswamy","M Chinnaswamy Stadium"],["jaitley","Arun Jaitley Stadium"],["feroz shah kotla","Arun Jaitley Stadium"],["rajiv gandhi","Rajiv Gandhi Intl Stadium"],["bindra","IS Bindra Stadium"],["punjab cricket association","IS Bindra Stadium"],["mohali","IS Bindra Stadium"],["maharashtra cricket association","MCA Stadium"],["subrata roy","MCA Stadium"],["mca","MCA Stadium"],["dy patil","DY Patil Stadium"],["narendra modi","Narendra Modi Stadium"],["motera","Narendra Modi Stadium"],["sardar patel","Narendra Modi Stadium"],["sawai","Sawai Mansingh Stadium"],["ekana","Ekana Cricket Stadium"],["brabourne","Brabourne Stadium"],["rajasekhara reddy","ACA-VDCA Cricket Stadium"],["aca-vdca","ACA-VDCA Cricket Stadium"],["maharaja yadavindra","Maharaja Yadavindra Singh Intl Cricket Stadium"],["zayed","Sheikh Zayed Stadium"]];
 return rules.find(([key]) => n.includes(key))?.[1] || name.split(",")[0].trim();
};
const slug = n => normalize(n).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const year = s => String(s).includes("/") ? Number(String(s).slice(0,2)+String(s).split("/")[1]) : Number(s);
const packs = new Map(), games = new Map();
for (const m of db.prepare("SELECT m.*,v.name venue,v.city FROM matches m JOIN venues v USING(venue_id)").all()) {
 const key = slug(m.venue), venue = normalize(m.venue);
 if (!packs.has(key)) packs.set(key,{version:1,venue,city:m.city||null,source:"CricField match and delivery warehouse",matches:[]});
 const condition = conditions[String(m.match_id)];
 const game = {id:String(m.match_id),season:year(m.season_id),time:typeof condition?.isNight === "boolean" ? condition.isNight ? "evening" : "afternoon" : null,innings:[],phases:[],surface:[],batters:[],bowlers:[],overs:[]};
 packs.get(key).matches.push(game); games.set(Number(m.match_id),game);
}
for (const r of db.prepare("SELECT match_id,innings_number n,runs,wickets,batting_team_id FROM innings WHERE innings_number IN (1,2)").all()) {
 const game=games.get(Number(r.match_id)); if(game)game.innings.push([r.n,r.runs,r.wickets]);
}
const players=new Map(db.prepare("SELECT player_id,name,cricsheet_id,bowling_style FROM players").all().map(p=>[Number(p.player_id),p]));
// Resolve styles by verified Cricsheet identity; never infer a bowling type from a surname.
const bios = JSON.parse(fs.readFileSync(path.join(root,"artifacts/ipl-analytics/public/data/player-bio.json"),"utf8"));
const identity = JSON.parse(fs.readFileSync(path.join(root,"artifacts/ipl-analytics/public/data/player-recent-matches/index.json"),"utf8")).keys;
const byId = new Map();
for (const [key,[id]] of Object.entries(identity)) {
 const bio = bios[key]; if(!bio) continue;
 const current = byId.get(id);
 if(!current || (current.playerId === undefined && bio.playerId !== undefined)) byId.set(id,bio);
}
for(const p of players.values()) p.bowling_style ||= byId.get(p.cricsheet_id)?.bowlStyle || "";
const wickets = new Map();
for(const r of db.prepare("SELECT delivery_id,kind FROM dismissals").all()) {
 if(!wickets.has(Number(r.delivery_id))) wickets.set(Number(r.delivery_id),[]);
 wickets.get(Number(r.delivery_id)).push(r.kind);
}
const accum = new Map();
const plus=(map,key,make)=> {if(!map.has(key))map.set(key,make());return map.get(key);};
for(const d of db.prepare("SELECT d.*,i.innings_number inn FROM deliveries d JOIN innings i USING(innings_id) WHERE i.innings_number IN (1,2) ORDER BY d.match_id,d.innings_id,d.over_num,d.delivery_id").iterate()) {
 const id=Number(d.match_id); if(!games.has(id))continue;
 const a=plus(accum,id,()=>({phases:new Map(),surface:new Map(),batters:new Map(),bowlers:new Map(),overs:new Map()}));
 const legal=!d.is_wide&&!d.is_noball ? 1 : 0;
 const kinds=wickets.get(Number(d.delivery_id))||[];
 const teamWickets=kinds.filter(k=>k!=="retired hurt").length;
 const bowlerWickets=kinds.filter(k=>!["retired hurt","retired out","run out","obstructing the field"].includes(k)).length;
 const runs=Number(d.total_runs)||0;
 const conceded=runs-((d.is_bye||d.is_legbye||d.is_penalty)?Number(d.extra_runs)||0:0);
 const phase=plus(a.phases,d.phase||"Unknown",()=>[0,0,0,0,0]);
 phase[0]+=legal;phase[1]+=runs;phase[2]+=d.is_boundary?1:0;phase[3]+=legal&&runs===0?1:0;phase[4]+=teamWickets;
 const style=(players.get(Number(d.bowler_id))?.bowling_style||"").toLowerCase();
 const kind=/spin|break|orthodox|slow|chinaman/.test(style)?"Spin":/fast|medium|pace|seam/.test(style)?"Pace":null;
 if(kind){const surface=plus(a.surface,kind,()=>[0,0,0,0]);surface[0]+=legal;surface[1]+=conceded;surface[2]+=bowlerWickets;surface[3]+=legal&&runs===0?1:0;}
 const bat=plus(a.batters,Number(d.batter_id),()=>[0,0]);bat[0]+=Number(d.batter_runs)||0;bat[1]+=!d.is_wide?1:0;
 const bowl=plus(a.bowlers,Number(d.bowler_id),()=>[0,0,0]);bowl[0]+=bowlerWickets;bowl[1]+=legal;bowl[2]+=conceded;
 if(Number(d.inn)===1){const over=plus(a.overs,Number(d.over_num)+1,()=>[0,0]);over[0]+=runs;over[1]+=legal;}
}
for(const [id,a] of accum){
 const game=games.get(id);
 game.phases=[...a.phases].map(([phase,v])=>[phase,...v]);
 game.surface=[...a.surface].map(([kind,v])=>[kind,...v]);
 game.batters=[...a.batters].map(([id,v])=>[players.get(id)?.name||String(id),...v]);
 game.bowlers=[...a.bowlers].map(([id,v])=>[players.get(id)?.name||String(id),...v]);
 let total=0;game.overs=[...a.overs].sort((a,b)=>a[0]-b[0]).flatMap(([over,v])=>{total+=v[0];return v[1]>=6?[[over,total]]:[];});
}
let bytes=0;
for(const [key,pack] of packs){const text=JSON.stringify(pack);fs.writeFileSync(path.join(out,key+".json"),text);bytes+=Buffer.byteLength(text);}
db.close();
console.log(JSON.stringify({venues:packs.size,matches:games.size,bytes,output:out}));
