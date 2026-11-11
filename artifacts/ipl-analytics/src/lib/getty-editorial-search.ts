export interface GettyQueryInput {
 playerName?:string;franchise?:string;opponent?:string;venue?:string;year?:number|string;date?:string;context?:string;
 eventType?:'debut'|'match_performance'|'trophy'|'portrait'|'auction'|'venue'|'article';
 sort?:'best'|'newest';
}
const quote=(value:string)=>`"${value.replace(/["\\]/g,' ').trim()}"`;
/** Search discovery only: never fabricates an asset ID, caption or signed embed. */
export function buildGettyEditorialUrl(input:GettyQueryInput):string{
 const parts=[input.playerName,input.franchise,input.opponent,input.venue,input.context].filter((v):v is string=>!!v?.trim()).map(quote);
 if(input.date)parts.push(quote(input.date));else if(input.year)parts.push(String(input.year));
 if(input.eventType==='portrait')parts.push('(portrait OR headshot)');
 else if(input.eventType==='trophy')parts.push('trophy "IPL Final"');
 else if(input.eventType==='auction')parts.push('"Indian Premier League" "Player Auction"');
 else if(input.eventType==='debut')parts.push('"IPL" (debut OR "first match")');
 else if(input.eventType==='venue')parts.push('"IPL" match stadium cricket');
 else parts.push('"IPL" cricket');
 parts.push('-commercial');
 return `https://www.gettyimages.in/photos/${encodeURIComponent(parts.join(' '))}?family=editorial&assettype=image&sort=${input.sort??'best'}`;
}
/** Extract only IDs from a genuine Getty detail URL; search links are not assets. */
export function getGettyAssetId(source:string):string|null{
 try{const url=new URL(source);if(!/(^|\.)gettyimages\.(com|in|co\.uk)$/.test(url.hostname))return null;return url.pathname.match(/^\/detail\/(?:.*\/)?(\d{6,12})\/?$/)?.[1]??null;}catch{return null;}
}
export interface GettyAssetMapping {
 contentId:string;playerId?:string;eventDate?:string;gettyAssetId:string;sourceUrl:string;
 embedHtml?:string;caption?:string;captionVerified:boolean;licenseReference?:string;
 status:'candidate'|'caption-verified'|'ready';
}
