import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseScoutPlan, scoutPlanSchema } from '../src/services/scout-conversation';
test('natural-language plan permits bounded multi-league death-over discovery',()=>{
 const plan=parseScoutPlan('```json\n{"needsPlayers":true,"discipline":"batting","competitions":["ipl","smat"],"phase":"death","minimumStrikeRate":170}\n```');
 assert.equal(plan.minBalls,120);assert.equal(plan.minimumStrikeRate,170);assert.equal(plan.phase,'death');
});
test('planner cannot execute SQL or inject arbitrary query keys',()=>{
 assert.equal(scoutPlanSchema.safeParse({needsPlayers:true,sql:'DELETE FROM players'}).success,false);
 assert.equal(scoutPlanSchema.safeParse({needsPlayers:true,minBalls:-1}).success,false);
 assert.equal(scoutPlanSchema.safeParse({needsPlayers:true,competitions:['invented']}).success,false);
});
test('conceptual questions and missing attributes retain clarification',()=>{
 const plan=parseScoutPlan('{"needsPlayers":false,"clarification":"Bowling speed is not recorded"}');
 assert.equal(plan.needsPlayers,false);assert.match(plan.clarification!,/not recorded/);
});
