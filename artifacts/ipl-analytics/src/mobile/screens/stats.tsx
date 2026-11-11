import StatsPage from "@/pages/stats";
import { MobileChromeContext } from "../gate";
import "./stats-centre.css";
export default function MobileStats(){return <MobileChromeContext.Provider value={true}><StatsPage mobilePresentation/></MobileChromeContext.Provider>;}
