import { CricFieldMascot } from '@/components/CricFieldMascot';
import './scout-ball-loader.css';
export function ScoutBallLoader(){
 return <div className="scout-mascot-loader" aria-hidden="true"><div className="scout-mascot-body"><CricFieldMascot activity="analyzing" size={152}/></div></div>;
}
