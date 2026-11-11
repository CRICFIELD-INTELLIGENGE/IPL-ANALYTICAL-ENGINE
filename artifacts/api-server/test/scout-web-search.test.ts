import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseWebResults,searchCricketWeb} from '../src/services/scout-web-search';
test('web evidence excludes unsafe links',()=>{const rows=parseWebResults({organic_results:[{title:'Cricket',link:'https://example.com/report'},{title:'bad',link:'javascript:alert(1)'}]});assert.equal(rows.length,1);assert.equal(rows[0].id,'W1');});
test('disabled search never calls external service',async()=>{const previous=process.env.SCOUT_WEB_SEARCH_ENABLED;process.env.SCOUT_WEB_SEARCH_ENABLED='false';try{const result=await searchCricketWeb('IPL',async()=>{throw Error('must not call');});assert.match(result.status,/not configured/);}finally{if(previous===undefined)delete process.env.SCOUT_WEB_SEARCH_ENABLED;else process.env.SCOUT_WEB_SEARCH_ENABLED=previous;}});
