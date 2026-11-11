import {useEffect,useState} from 'react';
export function useAuthStage(){
 const measure=()=>{const wide=innerWidth>=1000||innerWidth/innerHeight>1.3;const baseWidth=wide?1440:390,baseHeight=wide?900:844;const scale=Math.min(innerWidth/baseWidth,innerHeight/baseHeight);return {width:innerWidth/scale,height:innerHeight/scale,wide,scale};};
 const [stage,setStage]=useState(measure);
 useEffect(()=>{let frame=0;const resize=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>setStage(measure()));};addEventListener('resize',resize);return()=>{removeEventListener('resize',resize);cancelAnimationFrame(frame);};},[]);
 return stage;
}
