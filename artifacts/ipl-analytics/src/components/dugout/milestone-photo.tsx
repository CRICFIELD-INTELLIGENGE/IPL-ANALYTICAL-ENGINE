import {PUBLIC_MANIFEST,isPublishable,isLocalPreviewable} from '@/lib/editorial-images';
import {EditorialImageFigure} from './editorial-image-figure';
import gettyMappings from '@/data/milestone-getty-mappings.json';
import { useState, type CSSProperties } from "react";

import { ArrowRight, Expand } from "lucide-react";

import { Link } from "wouter";

import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

import type { MilestonePhoto } from "@/lib/milestone-photography";

import type { FranchiseMilestone } from "@/lib/franchise-milestones";

import type { TeamTheme } from "@/lib/team-context";



export function MilestonePhotoGallery({ frames, moment, team }: { frames: MilestonePhoto[]; moment: FranchiseMilestone; team: TeamTheme }) {

  const [index, setIndex] = useState(0);

  const [expanded, setExpanded] = useState(false);

  const [failed, setFailed] = useState<string[]>([]);

  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const available = frames.filter(frame => !failed.includes(frame.eventPhoto.src));

  const frame = available[Math.min(index, available.length - 1)];

  const photo = frame?.eventPhoto;

  if (!photo) return <figure className="fm-photo-panel"><div className="fm-photo-fallback fm-photo-unavailable"><div><img src={team.logoImg} alt="" /><strong>{team.shortName} · {moment.season ?? "The legacy"}</strong><p>A verified photograph of this team at this occasion is not yet available.</p>{moment.match && <Link href={`/match/${moment.match.id}`}>Relive the match <ArrowRight size={14} /></Link>}</div></div></figure>;

  const mapped=gettyMappings.find(mapping=>mapping.localPhoto===photo.src);
  const gettyPhoto=PUBLIC_MANIFEST.images.find(image=>mapped?.candidates.some(candidate=>candidate.assetId===image.assetId)&&(isPublishable(image)||isLocalPreviewable(image)));
  const showcase = photo.presentation !== "landscape";

  const getty = gettyMappings.find(mapping=>mapping.localPhoto===photo.src);
  const caption = <><p>{photo.caption}</p><span>{photo.credit}</span><a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer">Original photo source <ArrowRight size={12} /></a>{getty?.candidates.slice(0,3).map(candidate=><a key={candidate.assetId} href={candidate.sourcePageUrl ?? undefined} target="_blank" rel="noopener noreferrer" title={candidate.caption ?? undefined}>Getty · same-event frame #{candidate.assetId} ↗</a>)}</>;

  return <Dialog open={expanded} onOpenChange={setExpanded}><figure className={`fm-photo-panel fm-memory ${showcase ? "is-showcase" : "is-landscape"}`}>

    <div className="fm-photo-heading"><span>{frame.exactEvent ? `RELIVE ${photo.season} · ${photo.occasion === "final" ? "THE FINAL" : "THE MATCH"}` : `THE ${photo.season} CAMPAIGN`}</span><span>{team.shortName}</span></div>

    <div className={`fm-memory-stage ${photo.presentation}`} style={{ "--fm-tilt-x": `${tilt.x}deg`, "--fm-tilt-y": `${tilt.y}deg` } as CSSProperties}

      onPointerMove={event => { if (!showcase || event.pointerType !== "mouse") return; const box = event.currentTarget.getBoundingClientRect(); setTilt({ x: (event.clientY - box.top - box.height / 2) / box.height * -5, y: (event.clientX - box.left - box.width / 2) / box.width * 7 }); }}

      onPointerLeave={() => setTilt({ x: 0, y: 0 })}>

      {showcase && <><span className="fm-memory-year" aria-hidden="true">{photo.season}</span><div className="fm-memory-orbit" /><div className="fm-memory-plinth" /></>}

      {gettyPhoto?<EditorialImageFigure image={gettyPhoto}/>:<img className="fm-event-photo" src={photo.src} alt={photo.caption} width={photo.width} height={photo.height} loading="lazy" decoding="async" onError={() => setFailed(previous => [...previous, photo.src])} />}

      <DialogTrigger asChild><button className="fm-photo-expand" aria-label={`Enlarge ${team.shortName} ${photo.season} photograph`}><Expand size={15} /> <span>View moment</span></button></DialogTrigger>

    </div>

    {available.length > 1 && <div className="fm-memory-frames" aria-label="Photographs from this occasion">{available.map((item, i) => <button key={item.eventPhoto.src} aria-pressed={i === Math.min(index, available.length - 1)} aria-label={`Show ${item.eventPhoto.presentation === "cutout" ? "standing showcase" : "photograph"} ${i + 1}`} onClick={() => { setIndex(i); setTilt({ x: 0, y: 0 }); }}><img src={item.eventPhoto.src} alt="" loading="lazy" /><span>{item.eventPhoto.presentation === "cutout" ? "Showcase" : `Frame ${i + 1}`}</span></button>)}</div>}

    <figcaption>{caption}</figcaption>

    <DialogContent className="fm-photo-modal"><DialogTitle className="sr-only">{team.shortName} · {photo.season} · {photo.caption}</DialogTitle><img src={photo.src} alt={photo.caption} /><DialogDescription>{photo.caption}<br />{photo.credit}</DialogDescription></DialogContent>

  </figure></Dialog>;

}

