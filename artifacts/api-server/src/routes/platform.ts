import { Router } from 'express';
import { z } from 'zod';
import { requireAdmin } from '../lib/admin-auth';
import { rateLimit } from '../lib/rate-limit';
import { platform } from '../services/platform/store';
import { verifiedUser,registeredCount } from '../services/platform/auth';
import { verifyUnsubscribe } from '../services/platform/delivery';
import { platformTick } from '../services/platform/worker';
const router=Router();
const topics=z.enum(['wicket','match_result','auction_purchase','player_update','daily_digest']);
const channels=z.enum(['in_app','email','whatsapp']);
router.get('/notifications',async(req,res)=>{const user=await verifiedUser(req);if(!user){res.status(401).json({error:'sign_in_required'});return;}const store=platform();const preference=store.preferences(user.id);res.json({preferences:preference?{topics:preference.topics,channels:preference.channels,phone:preference.phone,phoneVerified:!!preference.phone_verified}:null,notifications:store.inbox(user.id)});});
router.post('/notifications/preferences',async(req,res)=>{
  const user=await verifiedUser(req);if(!user){res.status(401).json({error:'sign_in_required'});return;}
  const parsed=z.object({topics:z.array(topics).max(5),channels:z.array(channels).max(3),phone:z.string().regex(/^\d{7,15}$/).optional()}).strict().refine(value=>!value.channels.includes('whatsapp')||!!value.phone).safeParse(req.body);
  if(!parsed.success){res.status(400).json({error:'invalid_preferences'});return;}
  platform().subscribe(user.id,user.email,[...new Set(parsed.data.topics)],[...new Set(parsed.data.channels)],parsed.data.phone);res.json({saved:true});
});
router.post('/notifications/read',async(req,res)=>{const user=await verifiedUser(req);if(!user){res.status(401).json({error:'sign_in_required'});return;}const body=z.object({id:z.string().uuid()}).safeParse(req.body);if(!body.success){res.status(400).json({error:'invalid_request'});return;}platform().read(user.id,body.data.id);res.json({ok:true});});
router.get('/notifications/unsubscribe',(req,res)=>{const token=typeof req.query.token==='string'?req.query.token:'';if(!verifyUnsubscribe(token)){res.status(400).send('Invalid unsubscribe link');return;}res.type('html').send(`<html><head><title>CricField email preferences</title></head><body><h1>Unsubscribe from CricField email alerts</h1><form method="post"><input type="hidden" name="token" value="${token.replace(/[^a-zA-Z0-9_.-]/g,'')}"><button>Confirm unsubscribe</button></form></body></html>`);});
router.post('/notifications/unsubscribe',(req,res)=>{const uid=verifyUnsubscribe(typeof req.body?.token==='string'?req.body.token:'');if(!uid){res.status(400).send('Invalid link');return;}const store=platform(),p=store.preferences(uid);if(p)store.subscribe(uid,p.email,p.topics,p.channels.filter((c:string)=>c!=='email'),p.phone??undefined);res.send('Unsubscribed from email alerts.');});
router.post('/admin/events',requireAdmin,(req,res)=>{
  const parsed=z.object({id:z.string().min(3).max(160),kind:topics,title:z.string().trim().min(3).max(160),body:z.string().trim().min(3).max(4000),source:z.string().url().max(500).refine(s=>/^https:\/\//.test(s)),occurredAt:z.number().int().min(Date.now()-86400000).max(Date.now()+60000)}).strict().safeParse(req.body);
  if(!parsed.success){res.status(400).json({error:'invalid_event'});return;}res.json({created:platform().event(parsed.data)});
});
router.post('/admin/notifications/verify-whatsapp',requireAdmin,(req,res)=>{const parsed=z.object({userId:z.string().uuid(),phone:z.string().regex(/^\d{7,15}$/)}).strict().safeParse(req.body);if(!parsed.success){res.status(400).json({error:'invalid_request'});return;}const change=platform().db.prepare('UPDATE preferences SET phone_verified=1 WHERE user_id=? AND phone=?').run(parsed.data.userId,parsed.data.phone);res.json({verified:Number(change.changes)>0});});
router.post('/admin/jobs/run',requireAdmin,async(_req,res)=>{await platformTick();res.json({ok:true});});
router.get('/admin/analytics',requireAdmin,async(_req,res)=>{res.json({...platform().admin(),registeredUsers:await registeredCount()});});
const telemetry=z.object({session:z.string().uuid(),feature:z.enum(['home','scout','stats','arcade','analyst','account','dugout','scores','other']),action:z.enum(['page_view','engagement','heartbeat'])}).strict();
router.post('/analytics/events',rateLimit({name:'telemetry',max:30,windowMs:60000}),(req,res)=>{const parsed=telemetry.safeParse(req.body);if(!parsed.success){res.status(400).json({error:'invalid_event'});return;}platform().track(parsed.data.session,parsed.data.feature,parsed.data.action);res.json({ok:true});});
router.get('/analytics/public',async(_req,res)=>{res.json({...platform().metrics(),registeredUsers:await registeredCount(),scope:'Opt-in browser activity; excludes untracked visitors. Counts are not bot-verified.'});});
export default router;
