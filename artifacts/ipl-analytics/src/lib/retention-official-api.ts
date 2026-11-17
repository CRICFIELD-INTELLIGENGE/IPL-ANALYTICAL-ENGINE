import { apiGet } from "./discovery-api";
export type Verification = "verified" | "reported" | "conflict" | "unavailable";
export interface RetentionSource { publisher:string; official:boolean; url:string; publishedOn:string }
export interface OfficialPlayer {
  id:string; canonicalId:string|null; name:string; identityStatus:string; team:string;
  decision:"retained"|"released"|"traded_in"|"traded_out"; verification:Verification; announcedOn:string; sources:RetentionSource[];
  role:string|null; group:string; country:string|null; overseas:boolean|null;
  contractLakh:number|null; contractStatus:string; historicalContractLakh:number|null;
  trade:{from:string;to:string;feeLakh:number|null}|null;
  availability:{status:string;note:string;verification:string;sources:RetentionSource[]};
  performance:{seasons:{season:number;matches:number;batPerMatch:number;bowlPerMatch:number}[];projection:{rar:number;sd:number;bat:number;bowl:number;seasonsUsed:number[]}|null;phase:Record<string,number|null>;dataCutoff:string;modelVersion:string}|null;
  scoutUrl:string; auctionEligibility:string;
}
export interface OfficialRoom {
  season:number;team:string;version:string;announcedOn:string;reviewedAt:string;status:string;
  players:OfficialPlayer[];composition:{key:string;count:number}[];
  summary:{retained:number;released:number;tradedIn:number;tradedOut:number;indian:number;overseas:number;unknownNationality:number;slots:number;overseasSlots:number|null;reportedOverseasSlots:number;slotBasis:string;verifiedDecisions:number};
  purse:{valueLakh:number|null;status:Verification;claims:{valueLakh:number;source:RetentionSource}[];hasDisagreement:boolean};
  needs:{role:string;remaining:number;departures:number;priority:string;evidence:{name:string;decision:string;verification:string}[];scoutUrl:string;note:string}[];
  notes:string[];sources:RetentionSource[];
  auction:{canInitialize:boolean;purseLakh:number|null;retainedIds:string[];registeredPool:{canonicalId:string;source:string;basePriceLakh:number}[];note:string};
}
export interface OfficialComparison {
  eligible:boolean;frozenAt:string|null;cutoff:string;counts:Record<string,number>;scored:number;accuracy:number|null;note:string;
  rows:{id:string;name:string;decision:string;prediction:string|null;category:string|null;status:string}[];
}
export const fetchOfficialRoom = (season:number,team:string) => apiGet<OfficialRoom>(`/api/retention/${season}/franchises/${team}/official`);
export const fetchOfficialComparison = (season:number,team:string) => apiGet<OfficialComparison>(`/api/retention/${season}/franchises/${team}/comparison`);
export const fetchOfficialLeague = (season=2027) => apiGet<{season:number;version:string;announcedOn:string;reviewedAt:string;teams:Pick<OfficialRoom,"team"|"status"|"summary"|"purse">[]}>(`/api/retention/${season}/official`);
export const decisionLabel = (value:string) => ({retained:"Retained",released:"Released",traded_in:"Traded in",traded_out:"Traded out"}[value] ?? value);
export const roleLabel = (value:string) => ({batter:"Batters",wicketkeeper:"Wicketkeepers","all-rounder":"All-rounders",pace:"Pace bowlers",spin:"Spinners",bowler:"Bowling style pending",unknown:"Role pending"}[value] ?? value);
export const formatPurse = (value:number|null) => value===null ? "Unverified" : `₹${(value/100).toFixed(2)} Cr`;
