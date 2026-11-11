import { AdSlot } from './ad-slot';
export type AdVesselFormat = 'horizontal'|'rectangle'|'in-feed'|'compact'|'skyscraper';
interface Props {slot?:string;format?:AdVesselFormat;className?:string;label?:string;minHeight?:number}
export function AdVessel({slot,format='horizontal',className,minHeight}:Props){
 let slots:Record<string,string>={};try{slots=JSON.parse(import.meta.env.VITE_ADSENSE_SLOTS || '{}');}catch{}
 const configured=slot ? slots[slot] : undefined;
 return <AdSlot slot={configured} format="auto" className={className} minHeight={minHeight ?? (format==='rectangle'?250:90)}/>;
}
