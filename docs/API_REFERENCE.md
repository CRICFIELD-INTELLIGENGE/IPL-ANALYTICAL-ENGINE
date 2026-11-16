# API reference

Generated on 2026-11-16 from the route declarations in `artifacts/api-server/src/routes/*.ts`, mounted by `src/routes/index.ts` under `/api`. It lists 241 routes. Request and response shapes live in each handler (usually a `zod` schema next to it). `lib/api-spec/openapi.yaml` covers only part of the API.

**Production note:** the deployed site (Vercel) runs no API. These routes exist only when `artifacts/api-server` is running (see [DEPLOYMENT.md](DEPLOYMENT.md)).

## Cross-cutting rules (`src/app.ts`)

- Every `/api` response sends `Cache-Control: no-store`.
- General rate limit: `RATE_LIMIT_API_PER_MIN` per client per minute (default 600).
- "heavy limit": `RATE_LIMIT_HEAVY_PER_MIN` (default 60) applies to `/api/stats`, `/api/ipl/stats`, `/api/stat-builder`, `/api/scenario-intelligence`, `/api/strategy/simulate`, `/api/alt-universe/simulate`, `/api/opposition`, `/api/optimizer/playing-xi`, `/api/ask`, `/api/get-clip-route` and `/api/ipl/sync-csv`, plus their sub-paths.
- "admin token": the route uses `requireAdmin` (`src/lib/admin-auth.ts`). It answers 404 unless `ADMIN_API_TOKEN` is set (at least 24 characters) and checks the token in constant time. For `/api/video`, every method except GET and HEAD requires the admin token.
- Platform routes check the signed-in user through Supabase (`services/platform/auth.ts`) and return 401 `sign_in_required` without a valid user.
- Unknown `/api` paths return 404 `{"error":"not_found"}`.

## Routes

| Method | Path | Defined in | Guards |
|---|---|---|---|
| POST | `/api/ai/analyst` | [ai-analyst.ts:65](../artifacts/api-server/src/routes/ai-analyst.ts#L65) | own rate limit |
| POST | `/api/scout/analyst` | [ai-analyst.ts:80](../artifacts/api-server/src/routes/ai-analyst.ts#L80) | own rate limit |
| GET | `/api/scout/analyst/status` | [ai-analyst.ts:93](../artifacts/api-server/src/routes/ai-analyst.ts#L93) |  |
| POST | `/api/ai/commentary` | [ai-commentary.ts:12](../artifacts/api-server/src/routes/ai-commentary.ts#L12) | own rate limit |
| GET | `/api/arcade/capabilities` | [arcade.ts:72](../artifacts/api-server/src/routes/arcade.ts#L72) |  |
| GET | `/api/arcade/games` | [arcade.ts:73](../artifacts/api-server/src/routes/arcade.ts#L73) |  |
| GET | `/api/arcade/meta` | [arcade.ts:74](../artifacts/api-server/src/routes/arcade.ts#L74) |  |
| GET | `/api/arcade/players/search` | [arcade.ts:75](../artifacts/api-server/src/routes/arcade.ts#L75) |  |
| GET | `/api/arcade/base-rates` | [arcade.ts:76](../artifacts/api-server/src/routes/arcade.ts#L76) |  |
| POST | `/api/arcade/higher-or-lower/start` | [arcade.ts:82](../artifacts/api-server/src/routes/arcade.ts#L82) |  |
| POST | `/api/arcade/higher-or-lower/:id/guess` | [arcade.ts:95](../artifacts/api-server/src/routes/arcade.ts#L95) |  |
| GET | `/api/arcade/guess-cricketer/modes` | [arcade.ts:118](../artifacts/api-server/src/routes/arcade.ts#L118) |  |
| POST | `/api/arcade/guess-cricketer/start` | [arcade.ts:119](../artifacts/api-server/src/routes/arcade.ts#L119) |  |
| POST | `/api/arcade/guess-cricketer/:id/clue` | [arcade.ts:141](../artifacts/api-server/src/routes/arcade.ts#L141) |  |
| POST | `/api/arcade/guess-cricketer/:id/answer` | [arcade.ts:148](../artifacts/api-server/src/routes/arcade.ts#L148) |  |
| POST | `/api/arcade/guess-cricketer/:id/give-up` | [arcade.ts:162](../artifacts/api-server/src/routes/arcade.ts#L162) |  |
| POST | `/api/arcade/cricket-grid/start` | [arcade.ts:171](../artifacts/api-server/src/routes/arcade.ts#L171) |  |
| POST | `/api/arcade/cricket-grid/:id/guess` | [arcade.ts:197](../artifacts/api-server/src/routes/arcade.ts#L197) |  |
| POST | `/api/arcade/cricket-grid/:id/finish` | [arcade.ts:216](../artifacts/api-server/src/routes/arcade.ts#L216) |  |
| GET | `/api/arcade/time-machine/chapters` | [arcade.ts:225](../artifacts/api-server/src/routes/arcade.ts#L225) |  |
| POST | `/api/arcade/time-machine/start` | [arcade.ts:226](../artifacts/api-server/src/routes/arcade.ts#L226) |  |
| POST | `/api/arcade/time-machine/:id/answer` | [arcade.ts:233](../artifacts/api-server/src/routes/arcade.ts#L233) |  |
| POST | `/api/arcade/next-ball/start` | [arcade.ts:259](../artifacts/api-server/src/routes/arcade.ts#L259) |  |
| POST | `/api/arcade/next-ball/:id/guess` | [arcade.ts:272](../artifacts/api-server/src/routes/arcade.ts#L272) |  |
| POST | `/api/arcade/scout-gem/start` | [arcade.ts:293](../artifacts/api-server/src/routes/arcade.ts#L293) |  |
| POST | `/api/arcade/scout-gem/:id/answer` | [arcade.ts:300](../artifacts/api-server/src/routes/arcade.ts#L300) |  |
| POST | `/api/arcade/session/start` | [arcade.ts:315](../artifacts/api-server/src/routes/arcade.ts#L315) |  |
| POST | `/api/arcade/session/:id/submit` | [arcade.ts:337](../artifacts/api-server/src/routes/arcade.ts#L337) |  |
| GET | `/api/arcade/xi/pool` | [arcade.ts:437](../artifacts/api-server/src/routes/arcade.ts#L437) |  |
| POST | `/api/arcade/xi/evaluate` | [arcade.ts:443](../artifacts/api-server/src/routes/arcade.ts#L443) |  |
| POST | `/api/arcade/xi/submit` | [arcade.ts:447](../artifacts/api-server/src/routes/arcade.ts#L447) |  |
| GET | `/api/arcade/gm/setup` | [arcade.ts:457](../artifacts/api-server/src/routes/arcade.ts#L457) |  |
| POST | `/api/arcade/gm/strength` | [arcade.ts:458](../artifacts/api-server/src/routes/arcade.ts#L458) |  |
| POST | `/api/arcade/gm/trade` | [arcade.ts:459](../artifacts/api-server/src/routes/arcade.ts#L459) |  |
| POST | `/api/arcade/gm/season` | [arcade.ts:463](../artifacts/api-server/src/routes/arcade.ts#L463) |  |
| GET | `/api/arcade/passport` | [arcade.ts:476](../artifacts/api-server/src/routes/arcade.ts#L476) |  |
| POST | `/api/arcade/passport/profile` | [arcade.ts:477](../artifacts/api-server/src/routes/arcade.ts#L477) |  |
| GET | `/api/arcade/leaderboard/:game` | [arcade.ts:483](../artifacts/api-server/src/routes/arcade.ts#L483) |  |
| GET | `/api/arcade/saves/:game` | [arcade.ts:491](../artifacts/api-server/src/routes/arcade.ts#L491) |  |
| PUT | `/api/arcade/saves/:game/:slot` | [arcade.ts:492](../artifacts/api-server/src/routes/arcade.ts#L492) |  |
| DELETE | `/api/arcade/saves/:game/:slot` | [arcade.ts:498](../artifacts/api-server/src/routes/arcade.ts#L498) |  |
| POST | `/api/arcade/rooms` | [arcade.ts:501](../artifacts/api-server/src/routes/arcade.ts#L501) |  |
| POST | `/api/arcade/rooms/join` | [arcade.ts:502](../artifacts/api-server/src/routes/arcade.ts#L502) |  |
| GET | `/api/arcade/rooms/:code` | [arcade.ts:503](../artifacts/api-server/src/routes/arcade.ts#L503) |  |
| POST | `/api/arcade/rooms/:code/leave` | [arcade.ts:504](../artifacts/api-server/src/routes/arcade.ts#L504) |  |
| POST | `/api/arcade/rooms/:code/start` | [arcade.ts:505](../artifacts/api-server/src/routes/arcade.ts#L505) |  |
| GET | `/api/arcade/draft/pool` | [arcade.ts:506](../artifacts/api-server/src/routes/arcade.ts#L506) |  |
| POST | `/api/arcade/draft/create` | [arcade.ts:507](../artifacts/api-server/src/routes/arcade.ts#L507) |  |
| POST | `/api/arcade/draft/join` | [arcade.ts:508](../artifacts/api-server/src/routes/arcade.ts#L508) |  |
| GET | `/api/arcade/draft/:code` | [arcade.ts:509](../artifacts/api-server/src/routes/arcade.ts#L509) |  |
| POST | `/api/arcade/draft/:code/action` | [arcade.ts:510](../artifacts/api-server/src/routes/arcade.ts#L510) |  |
| POST | `/api/arcade/match/bot` | [arcade.ts:511](../artifacts/api-server/src/routes/arcade.ts#L511) |  |
| GET | `/api/arcade/match/:code` | [arcade.ts:512](../artifacts/api-server/src/routes/arcade.ts#L512) |  |
| POST | `/api/arcade/match/:code/action` | [arcade.ts:513](../artifacts/api-server/src/routes/arcade.ts#L513) |  |
| GET | `/api/auction-2027` | [auction-2027.ts:129](../artifacts/api-server/src/routes/auction-2027.ts#L129) |  |
| POST | `/api/auction-2027/updates` | [auction-2027.ts:133](../artifacts/api-server/src/routes/auction-2027.ts#L133) | admin token |
| GET | `/api/auction/state` | [auction.ts:28](../artifacts/api-server/src/routes/auction.ts#L28) |  |
| POST | `/api/auction/start` | [auction.ts:32](../artifacts/api-server/src/routes/auction.ts#L32) |  |
| POST | `/api/auction/select-team` | [auction.ts:37](../artifacts/api-server/src/routes/auction.ts#L37) |  |
| POST | `/api/auction/bid` | [auction.ts:44](../artifacts/api-server/src/routes/auction.ts#L44) |  |
| POST | `/api/auction/pause` | [auction.ts:51](../artifacts/api-server/src/routes/auction.ts#L51) |  |
| POST | `/api/auction/resume` | [auction.ts:56](../artifacts/api-server/src/routes/auction.ts#L56) |  |
| POST | `/api/auction/chat` | [auction.ts:61](../artifacts/api-server/src/routes/auction.ts#L61) |  |
| POST | `/api/auction/create-room` | [auction.ts:68](../artifacts/api-server/src/routes/auction.ts#L68) |  |
| POST | `/api/auction/join-room` | [auction.ts:72](../artifacts/api-server/src/routes/auction.ts#L72) |  |
| POST | `/api/auction/set-speed` | [auction.ts:78](../artifacts/api-server/src/routes/auction.ts#L78) |  |
| POST | `/api/auction/reset` | [auction.ts:85](../artifacts/api-server/src/routes/auction.ts#L85) |  |
| POST | `/api/get-clip-route` | [clip-router.ts:197](../artifacts/api-server/src/routes/clip-router.ts#L197) | heavy limit |
| GET | `/api/get-clip-catalog` | [clip-router.ts:222](../artifacts/api-server/src/routes/clip-router.ts#L222) |  |
| POST | `/api/ipl/sync-csv` | [csv-sync-route.ts:33](../artifacts/api-server/src/routes/csv-sync-route.ts#L33) | admin token, heavy limit |
| GET | `/api/decision/catalog` | [decision-intel.ts:82](../artifacts/api-server/src/routes/decision-intel.ts#L82) |  |
| GET | `/api/strategy/setup` | [decision-intel.ts:109](../artifacts/api-server/src/routes/decision-intel.ts#L109) |  |
| POST | `/api/strategy/simulate` | [decision-intel.ts:151](../artifacts/api-server/src/routes/decision-intel.ts#L151) | heavy limit |
| GET | `/api/alt-universe/matches` | [decision-intel.ts:160](../artifacts/api-server/src/routes/decision-intel.ts#L160) |  |
| GET | `/api/alt-universe/match/:id` | [decision-intel.ts:167](../artifacts/api-server/src/routes/decision-intel.ts#L167) |  |
| POST | `/api/alt-universe/simulate` | [decision-intel.ts:187](../artifacts/api-server/src/routes/decision-intel.ts#L187) | heavy limit |
| GET | `/api/replay/matches` | [decision-intel.ts:196](../artifacts/api-server/src/routes/decision-intel.ts#L196) |  |
| GET | `/api/replay/:matchId` | [decision-intel.ts:203](../artifacts/api-server/src/routes/decision-intel.ts#L203) |  |
| GET | `/api/opposition` | [decision-intel.ts:212](../artifacts/api-server/src/routes/decision-intel.ts#L212) | heavy limit |
| GET | `/api/pool/:id` | [decision-intel.ts:224](../artifacts/api-server/src/routes/decision-intel.ts#L224) |  |
| GET | `/api/squad-dna/teams` | [decision-intel.ts:237](../artifacts/api-server/src/routes/decision-intel.ts#L237) |  |
| GET | `/api/squad-dna/profile` | [decision-intel.ts:242](../artifacts/api-server/src/routes/decision-intel.ts#L242) |  |
| GET | `/api/squad-dna/compare` | [decision-intel.ts:251](../artifacts/api-server/src/routes/decision-intel.ts#L251) |  |
| GET | `/api/war-room/board` | [decision-intel.ts:273](../artifacts/api-server/src/routes/decision-intel.ts#L273) |  |
| GET | `/api/war-room/player/:key` | [decision-intel.ts:281](../artifacts/api-server/src/routes/decision-intel.ts#L281) |  |
| GET | `/api/intel/player/:key` | [decision-intel.ts:294](../artifacts/api-server/src/routes/decision-intel.ts#L294) |  |
| GET | `/api/intel/team/:key` | [decision-intel.ts:332](../artifacts/api-server/src/routes/decision-intel.ts#L332) |  |
| GET | `/api/intel/venue/:key` | [decision-intel.ts:347](../artifacts/api-server/src/routes/decision-intel.ts#L347) |  |
| GET | `/api/intel/match/:id` | [decision-intel.ts:357](../artifacts/api-server/src/routes/decision-intel.ts#L357) |  |
| GET | `/api/dugout/franchise` | [decision-intel.ts:384](../artifacts/api-server/src/routes/decision-intel.ts#L384) |  |
| GET | `/api/dugout/squad` | [decision-intel.ts:393](../artifacts/api-server/src/routes/decision-intel.ts#L393) |  |
| GET | `/api/players/:id/summary` | [decision.ts:52](../artifacts/api-server/src/routes/decision.ts#L52) |  |
| GET | `/api/optimizer/franchises` | [decision.ts:63](../artifacts/api-server/src/routes/decision.ts#L63) |  |
| POST | `/api/optimizer/playing-xi` | [decision.ts:93](../artifacts/api-server/src/routes/decision.ts#L93) | heavy limit |
| POST | `/api/ask` | [decision.ts:148](../artifacts/api-server/src/routes/decision.ts#L148) | heavy limit |
| POST | `/api/ask/run` | [decision.ts:168](../artifacts/api-server/src/routes/decision.ts#L168) | heavy limit |
| GET | `/api/history/overview` | [decision.ts:183](../artifacts/api-server/src/routes/decision.ts#L183) |  |
| GET | `/api/players/search` | [decision.ts:192](../artifacts/api-server/src/routes/decision.ts#L192) |  |
| GET | `/api/weakness/:id` | [decision.ts:202](../artifacts/api-server/src/routes/decision.ts#L202) |  |
| GET | `/api/pressure/leaders` | [decision.ts:220](../artifacts/api-server/src/routes/decision.ts#L220) |  |
| GET | `/api/pressure/:id` | [decision.ts:230](../artifacts/api-server/src/routes/decision.ts#L230) |  |
| GET | `/api/insights/daily` | [decision.ts:248](../artifacts/api-server/src/routes/decision.ts#L248) |  |
| GET | `/api/insights/pool/:category` | [decision.ts:260](../artifacts/api-server/src/routes/decision.ts#L260) |  |
| GET | `/api/healthz` | [health.ts:6](../artifacts/api-server/src/routes/health.ts#L6) |  |
| GET | `/api/intelligence/players` | [intelligence.ts:60](../artifacts/api-server/src/routes/intelligence.ts#L60) |  |
| GET | `/api/intelligence/players/:key` | [intelligence.ts:67](../artifacts/api-server/src/routes/intelligence.ts#L67) |  |
| GET | `/api/intelligence/players/:key/valuation` | [intelligence.ts:78](../artifacts/api-server/src/routes/intelligence.ts#L78) |  |
| GET | `/api/intelligence/players/:key/retention` | [intelligence.ts:84](../artifacts/api-server/src/routes/intelligence.ts#L84) |  |
| GET | `/api/intelligence/players/:key/franchise-fit` | [intelligence.ts:88](../artifacts/api-server/src/routes/intelligence.ts#L88) |  |
| GET | `/api/intelligence/players/:key/comparables` | [intelligence.ts:92](../artifacts/api-server/src/routes/intelligence.ts#L92) |  |
| GET | `/api/intelligence/players/:key/replacements` | [intelligence.ts:96](../artifacts/api-server/src/routes/intelligence.ts#L96) |  |
| GET | `/api/intelligence/players/:key/citation` | [intelligence.ts:106](../artifacts/api-server/src/routes/intelligence.ts#L106) |  |
| GET | `/api/intelligence/compare` | [intelligence.ts:115](../artifacts/api-server/src/routes/intelligence.ts#L115) |  |
| GET | `/api/intelligence/teams` | [intelligence.ts:123](../artifacts/api-server/src/routes/intelligence.ts#L123) |  |
| GET | `/api/intelligence/teams/:team` | [intelligence.ts:124](../artifacts/api-server/src/routes/intelligence.ts#L124) |  |
| POST | `/api/intelligence/squad/simulate` | [intelligence.ts:132](../artifacts/api-server/src/routes/intelligence.ts#L132) | own rate limit |
| POST | `/api/intelligence/auction/simulate` | [intelligence.ts:139](../artifacts/api-server/src/routes/intelligence.ts#L139) | own rate limit |
| GET | `/api/intelligence/models/status` | [intelligence.ts:147](../artifacts/api-server/src/routes/intelligence.ts#L147) |  |
| GET | `/api/intelligence/diagnostics` | [intelligence.ts:154](../artifacts/api-server/src/routes/intelligence.ts#L154) |  |
| GET | `/api/intelligence/insights` | [intelligence.ts:155](../artifacts/api-server/src/routes/intelligence.ts#L155) |  |
| GET | `/api/ipl/overview` | [ipl.ts:87](../artifacts/api-server/src/routes/ipl.ts#L87) |  |
| GET | `/api/ipl/seasons` | [ipl.ts:97](../artifacts/api-server/src/routes/ipl.ts#L97) |  |
| GET | `/api/ipl/toss-analysis` | [ipl.ts:107](../artifacts/api-server/src/routes/ipl.ts#L107) |  |
| GET | `/api/ipl/phase-analysis` | [ipl.ts:117](../artifacts/api-server/src/routes/ipl.ts#L117) |  |
| GET | `/api/ipl/batsmen` | [ipl.ts:127](../artifacts/api-server/src/routes/ipl.ts#L127) |  |
| GET | `/api/ipl/batsmen/impact` | [ipl.ts:133](../artifacts/api-server/src/routes/ipl.ts#L133) |  |
| GET | `/api/ipl/batsmen/boundaries` | [ipl.ts:139](../artifacts/api-server/src/routes/ipl.ts#L139) |  |
| GET | `/api/ipl/bowlers` | [ipl.ts:145](../artifacts/api-server/src/routes/ipl.ts#L145) |  |
| GET | `/api/ipl/bowlers/death-specialists` | [ipl.ts:151](../artifacts/api-server/src/routes/ipl.ts#L151) |  |
| GET | `/api/ipl/teams` | [ipl.ts:161](../artifacts/api-server/src/routes/ipl.ts#L161) |  |
| GET | `/api/ipl/teams/head-to-head` | [ipl.ts:167](../artifacts/api-server/src/routes/ipl.ts#L167) |  |
| GET | `/api/ipl/teams/championship` | [ipl.ts:190](../artifacts/api-server/src/routes/ipl.ts#L190) |  |
| GET | `/api/ipl/venues` | [ipl.ts:200](../artifacts/api-server/src/routes/ipl.ts#L200) |  |
| GET | `/api/ipl/records` | [ipl.ts:210](../artifacts/api-server/src/routes/ipl.ts#L210) |  |
| GET | `/api/ipl/run-distribution` | [ipl.ts:216](../artifacts/api-server/src/routes/ipl.ts#L216) |  |
| GET | `/api/ipl/dismissals` | [ipl.ts:222](../artifacts/api-server/src/routes/ipl.ts#L222) |  |
| GET | `/api/ipl/top-batters` | [ipl.ts:232](../artifacts/api-server/src/routes/ipl.ts#L232) |  |
| GET | `/api/ipl/top-bowlers` | [ipl.ts:238](../artifacts/api-server/src/routes/ipl.ts#L238) |  |
| GET | `/api/ipl/matches` | [ipl.ts:244](../artifacts/api-server/src/routes/ipl.ts#L244) |  |
| GET | `/api/ipl/current-squads` | [ipl.ts:250](../artifacts/api-server/src/routes/ipl.ts#L250) |  |
| GET | `/api/ipl/squads-by-season` | [ipl.ts:256](../artifacts/api-server/src/routes/ipl.ts#L256) |  |
| GET | `/api/ipl/player-auctions` | [ipl.ts:262](../artifacts/api-server/src/routes/ipl.ts#L262) |  |
| GET | `/api/ipl/team-analytics` | [ipl.ts:268](../artifacts/api-server/src/routes/ipl.ts#L268) |  |
| GET | `/api/ipl/venue-analytics` | [ipl.ts:289](../artifacts/api-server/src/routes/ipl.ts#L289) |  |
| GET | `/api/ipl/matchup-opponents` | [ipl.ts:309](../artifacts/api-server/src/routes/ipl.ts#L309) |  |
| GET | `/api/ipl/captains` | [ipl.ts:321](../artifacts/api-server/src/routes/ipl.ts#L321) |  |
| GET | `/api/ipl/points-tables` | [ipl.ts:327](../artifacts/api-server/src/routes/ipl.ts#L327) |  |
| GET | `/api/ipl/player-career-stats` | [ipl.ts:333](../artifacts/api-server/src/routes/ipl.ts#L333) |  |
| GET | `/api/ipl/player-team-stats` | [ipl.ts:339](../artifacts/api-server/src/routes/ipl.ts#L339) |  |
| GET | `/api/ipl/player-season-stats` | [ipl.ts:345](../artifacts/api-server/src/routes/ipl.ts#L345) |  |
| GET | `/api/ipl/player-team-season-stats` | [ipl.ts:351](../artifacts/api-server/src/routes/ipl.ts#L351) |  |
| GET | `/api/ipl/player-images` | [ipl.ts:357](../artifacts/api-server/src/routes/ipl.ts#L357) |  |
| GET | `/api/ipl/player-photo-registry` | [ipl.ts:363](../artifacts/api-server/src/routes/ipl.ts#L363) |  |
| GET | `/api/ipl/season-tops` | [ipl.ts:369](../artifacts/api-server/src/routes/ipl.ts#L369) |  |
| GET | `/api/ipl/stats/query` | [ipl.ts:380](../artifacts/api-server/src/routes/ipl.ts#L380) | heavy limit |
| GET | `/api/ipl/stats/field-positions` | [ipl.ts:397](../artifacts/api-server/src/routes/ipl.ts#L397) | heavy limit |
| GET | `/api/ipl/stats/matchup` | [ipl.ts:409](../artifacts/api-server/src/routes/ipl.ts#L409) | heavy limit |
| GET | `/api/ipl/stats/scenario` | [ipl.ts:426](../artifacts/api-server/src/routes/ipl.ts#L426) | heavy limit |
| GET | `/api/ipl/stats/drilldown` | [ipl.ts:442](../artifacts/api-server/src/routes/ipl.ts#L442) | heavy limit |
| GET | `/api/stats/query` | [ipl.ts:464](../artifacts/api-server/src/routes/ipl.ts#L464) | heavy limit |
| GET | `/api/stats/drilldown` | [ipl.ts:520](../artifacts/api-server/src/routes/ipl.ts#L520) | heavy limit |
| GET | `/api/stats/matchup` | [ipl.ts:548](../artifacts/api-server/src/routes/ipl.ts#L548) | heavy limit |
| GET | `/api/stats/scenario` | [ipl.ts:564](../artifacts/api-server/src/routes/ipl.ts#L564) | heavy limit |
| GET | `/api/stats/pressure-reliability` | [ipl.ts:587](../artifacts/api-server/src/routes/ipl.ts#L587) | heavy limit |
| GET | `/api/stats/pressure-reliability/model` | [ipl.ts:620](../artifacts/api-server/src/routes/ipl.ts#L620) | heavy limit |
| GET | `/api/stats/player` | [ipl.ts:624](../artifacts/api-server/src/routes/ipl.ts#L624) | heavy limit |
| GET | `/api/stats/team` | [ipl.ts:644](../artifacts/api-server/src/routes/ipl.ts#L644) | heavy limit |
| GET | `/api/stats/venue` | [ipl.ts:665](../artifacts/api-server/src/routes/ipl.ts#L665) | heavy limit |
| GET | `/api/players` | [ipl.ts:690](../artifacts/api-server/src/routes/ipl.ts#L690) |  |
| GET | `/api/teams` | [ipl.ts:696](../artifacts/api-server/src/routes/ipl.ts#L696) |  |
| GET | `/api/matches` | [ipl.ts:702](../artifacts/api-server/src/routes/ipl.ts#L702) |  |
| GET | `/api/matchups` | [ipl.ts:708](../artifacts/api-server/src/routes/ipl.ts#L708) |  |
| GET | `/api/venues` | [ipl.ts:722](../artifacts/api-server/src/routes/ipl.ts#L722) |  |
| GET | `/api/stat-builder` | [ipl.ts:728](../artifacts/api-server/src/routes/ipl.ts#L728) | heavy limit |
| GET | `/api/scenario-intelligence` | [ipl.ts:744](../artifacts/api-server/src/routes/ipl.ts#L744) | heavy limit |
| GET | `/api/ipl/match/:matchId/scorecard` | [ipl.ts:762](../artifacts/api-server/src/routes/ipl.ts#L762) |  |
| GET | `/api/ipl/match/:matchId/commentary` | [ipl.ts:776](../artifacts/api-server/src/routes/ipl.ts#L776) |  |
| GET | `/api/ipl/insights` | [ipl.ts:785](../artifacts/api-server/src/routes/ipl.ts#L785) |  |
| GET | `/api/ipl/insights/go/:slug` | [ipl.ts:798](../artifacts/api-server/src/routes/ipl.ts#L798) |  |
| GET | `/api/ipl/insights/clicks` | [ipl.ts:808](../artifacts/api-server/src/routes/ipl.ts#L808) |  |
| GET | `/api/ipl/content/hub` | [ipl.ts:824](../artifacts/api-server/src/routes/ipl.ts#L824) |  |
| GET | `/api/ipl/content/business` | [ipl.ts:836](../artifacts/api-server/src/routes/ipl.ts#L836) |  |
| GET | `/api/ipl/news` | [ipl.ts:849](../artifacts/api-server/src/routes/ipl.ts#L849) |  |
| GET | `/api/live/matches` | [live.ts:11](../artifacts/api-server/src/routes/live.ts#L11) |  |
| GET | `/api/live/ipl/matches` | [live.ts:23](../artifacts/api-server/src/routes/live.ts#L23) |  |
| GET | `/api/live/news` | [live.ts:35](../artifacts/api-server/src/routes/live.ts#L35) |  |
| GET | `/api/live/orange-cap` | [live.ts:49](../artifacts/api-server/src/routes/live.ts#L49) |  |
| GET | `/api/live/purple-cap` | [live.ts:58](../artifacts/api-server/src/routes/live.ts#L58) |  |
| GET | `/api/live/trending` | [live.ts:67](../artifacts/api-server/src/routes/live.ts#L67) |  |
| GET | `/api/live/win-probability/:matchId` | [live.ts:76](../artifacts/api-server/src/routes/live.ts#L76) |  |
| GET | `/api/live/venue-insights/:venueId` | [live.ts:91](../artifacts/api-server/src/routes/live.ts#L91) |  |
| GET | `/api/live/match-details/:matchId` | [live.ts:100](../artifacts/api-server/src/routes/live.ts#L100) |  |
| GET | `/api/notifications` | [platform.ts:12](../artifacts/api-server/src/routes/platform.ts#L12) |  |
| POST | `/api/notifications/preferences` | [platform.ts:13](../artifacts/api-server/src/routes/platform.ts#L13) |  |
| POST | `/api/notifications/read` | [platform.ts:19](../artifacts/api-server/src/routes/platform.ts#L19) |  |
| GET | `/api/notifications/unsubscribe` | [platform.ts:20](../artifacts/api-server/src/routes/platform.ts#L20) |  |
| POST | `/api/notifications/unsubscribe` | [platform.ts:21](../artifacts/api-server/src/routes/platform.ts#L21) |  |
| POST | `/api/admin/events` | [platform.ts:22](../artifacts/api-server/src/routes/platform.ts#L22) | admin token |
| POST | `/api/admin/notifications/verify-whatsapp` | [platform.ts:26](../artifacts/api-server/src/routes/platform.ts#L26) | admin token |
| POST | `/api/admin/jobs/run` | [platform.ts:27](../artifacts/api-server/src/routes/platform.ts#L27) | admin token |
| GET | `/api/admin/analytics` | [platform.ts:28](../artifacts/api-server/src/routes/platform.ts#L28) | admin token |
| POST | `/api/analytics/events` | [platform.ts:30](../artifacts/api-server/src/routes/platform.ts#L30) | own rate limit |
| GET | `/api/analytics/public` | [platform.ts:31](../artifacts/api-server/src/routes/platform.ts#L31) |  |
| GET | `/api/retention/seasons` | [retention.ts:43](../artifacts/api-server/src/routes/retention.ts#L43) |  |
| GET | `/api/retention/summary` | [retention.ts:44](../artifacts/api-server/src/routes/retention.ts#L44) |  |
| GET | `/api/retention/history` | [retention.ts:45](../artifacts/api-server/src/routes/retention.ts#L45) |  |
| GET | `/api/retention/freezes/:id` | [retention.ts:46](../artifacts/api-server/src/routes/retention.ts#L46) |  |
| GET | `/api/retention/trades` | [retention.ts:52](../artifacts/api-server/src/routes/retention.ts#L52) |  |
| POST | `/api/retention/trades` | [retention.ts:57](../artifacts/api-server/src/routes/retention.ts#L57) | admin token |
| GET | `/api/retention/:season/franchises/:team` | [retention.ts:63](../artifacts/api-server/src/routes/retention.ts#L63) |  |
| GET | `/api/retention/:season/franchises/:team/picks` | [retention.ts:64](../artifacts/api-server/src/routes/retention.ts#L64) |  |
| GET | `/api/retention/:season/franchises/:team/intelligence` | [retention.ts:65](../artifacts/api-server/src/routes/retention.ts#L65) |  |
| GET | `/api/retention/:season/franchises/:team/forecast` | [retention.ts:87](../artifacts/api-server/src/routes/retention.ts#L87) |  |
| GET | `/api/retention/:season/franchises/:team/fan-results` | [retention.ts:88](../artifacts/api-server/src/routes/retention.ts#L88) |  |
| GET | `/api/retention/:season/franchises/:team/dilemmas` | [retention.ts:89](../artifacts/api-server/src/routes/retention.ts#L89) |  |
| GET | `/api/retention/:season/players/:key` | [retention.ts:90](../artifacts/api-server/src/routes/retention.ts#L90) |  |
| POST | `/api/retention/simulate` | [retention.ts:97](../artifacts/api-server/src/routes/retention.ts#L97) | own rate limit |
| POST | `/api/retention/ballots/check` | [retention.ts:105](../artifacts/api-server/src/routes/retention.ts#L105) | own rate limit |
| GET | `/api/retention/ballots/mine` | [retention.ts:111](../artifacts/api-server/src/routes/retention.ts#L111) |  |
| POST | `/api/retention/ballots` | [retention.ts:120](../artifacts/api-server/src/routes/retention.ts#L120) | own rate limit |
| POST | `/api/retention/:season/freeze` | [retention.ts:132](../artifacts/api-server/src/routes/retention.ts#L132) | admin token |
| POST | `/api/retention/:season/editorial` | [retention.ts:145](../artifacts/api-server/src/routes/retention.ts#L145) | admin token |
| GET | `/api/scout/search` | [scout.ts:61](../artifacts/api-server/src/routes/scout.ts#L61) |  |
| GET | `/api/scout/t20/coverage` | [scout.ts:72](../artifacts/api-server/src/routes/scout.ts#L72) |  |
| GET | `/api/scout/t20/suggestions` | [scout.ts:84](../artifacts/api-server/src/routes/scout.ts#L84) |  |
| GET | `/api/scout/t20/player/:id` | [scout.ts:106](../artifacts/api-server/src/routes/scout.ts#L106) |  |
| GET | `/api/scout/player/:id/recent-form` | [scout.ts:125](../artifacts/api-server/src/routes/scout.ts#L125) |  |
| GET | `/api/scout/rankings` | [scout.ts:191](../artifacts/api-server/src/routes/scout.ts#L191) |  |
| GET | `/api/scout/player/:id` | [scout.ts:280](../artifacts/api-server/src/routes/scout.ts#L280) |  |
| GET | `/api/scout/compare` | [scout.ts:380](../artifacts/api-server/src/routes/scout.ts#L380) |  |
| GET | `/api/scout/roles` | [scout.ts:476](../artifacts/api-server/src/routes/scout.ts#L476) |  |
| GET | `/api/scout/win-probability` | [scout.ts:491](../artifacts/api-server/src/routes/scout.ts#L491) |  |
| GET | `/api/scout/bayes-calculator` | [scout.ts:516](../artifacts/api-server/src/routes/scout.ts#L516) |  |
| GET | `/api/video/catalogue` | [video.ts:57](../artifacts/api-server/src/routes/video.ts#L57) |  |
| GET | `/api/video/match/:matchId` | [video.ts:68](../artifacts/api-server/src/routes/video.ts#L68) |  |
| GET | `/api/video/player/:playerId` | [video.ts:83](../artifacts/api-server/src/routes/video.ts#L83) |  |
| GET | `/api/video/stats` | [video.ts:98](../artifacts/api-server/src/routes/video.ts#L98) |  |
| POST | `/api/video/refresh` | [video.ts:103](../artifacts/api-server/src/routes/video.ts#L103) | admin token |
| POST | `/api/video/sync-hotstar` | [video.ts:113](../artifacts/api-server/src/routes/video.ts#L113) | admin token |
| POST | `/api/video/add-clip` | [video.ts:159](../artifacts/api-server/src/routes/video.ts#L159) | admin token |
| POST | `/api/video/webhooks/anakin` | [video.ts:245](../artifacts/api-server/src/routes/video.ts#L245) | admin token |
