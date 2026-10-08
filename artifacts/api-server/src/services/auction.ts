import { EventEmitter } from "events";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* -------------------------------- TYPES -------------------------------- */

export interface AuctionPlayer {
  id: number;
  name: string;
  role: "Batsman" | "Bowler" | "All-rounder" | "Wicketkeeper";
  country: string;
  basePrice: number; // Lakhs
  img: string;
  form: number;
  clutch: number;
  versatility: number;
  expectedValue: number; // Cr
  rarity: "Legend" | "Elite" | "Standard";
  status: "POOL" | "SOLD" | "UNSOLD" | "ACTIVE";
  boughtBy?: string;
  salePrice?: number;
}

export interface AuctionTeam {
  id: number;
  name: string;
  purse: number; // Cr
  spent: number;
  squad: AuctionPlayer[];
  isAI: boolean;
  rtmCards: number;
}

export interface AuctionState {
  sessionId: string;
  status: "WAITING" | "ACTIVE" | "PAUSED" | "SOLD" | "UNSOLD" | "FINISHED";
  round: "MARQUEE" | "REGULAR" | "ACCELERATED" | "FINISHED";
  mode: "SINGLEPLAYER" | "MULTIPLAYER";
  roomCode: string | null;
  aiSpeed: number; // 1 = 1.6s, 2 = 0.8s, 3 = 0.4s
  userTeamId: number | null;
  currentPlayer: AuctionPlayer | null;
  currentBid: number; // Lakhs
  highestBidderId: number | null;
  timeLeft: number;
  logs: { id: number; msg: string; type: string; time: string }[];
  teams: AuctionTeam[];
  playerPool: AuctionPlayer[];
  chat: { id: number; user: string; team: string; msg: string; time: string }[];
}

export function getOfficialIplIncrement(currentBidLakhs: number): number {
  if (currentBidLakhs < 100) return 10;     // Up to ₹1 Cr: +10 Lakhs
  if (currentBidLakhs < 200) return 20;     // ₹1 Cr to ₹2 Cr: +20 Lakhs
  if (currentBidLakhs < 500) return 25;     // ₹2 Cr to ₹5 Cr: +25 Lakhs
  if (currentBidLakhs < 1000) return 50;    // ₹5 Cr to ₹10 Cr: +50 Lakhs
  return 100;                               // Above ₹10 Cr: +1.00 Cr
}

/* -------------------------------- SERVICE -------------------------------- */

class AuctionEngine extends EventEmitter {
  private state: AuctionState;
  private timer: NodeJS.Timeout | null = null;
  private aiInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.state = this.getInitialState();
  }

  private getInitialState(): AuctionState {
    let players: AuctionPlayer[] = [];
    try {
      const paths = [
        path.resolve(__dirname, "../data/players.json"),
        path.resolve(__dirname, "../../data/players.json"),
        path.resolve(__dirname, "./data/players.json"),
        path.resolve(process.cwd(), "data/players.json"),
        path.resolve(process.cwd(), "artifacts/api-server/data/players.json")
      ];

      for (const p of paths) {
        if (fs.existsSync(p)) {
          console.log("Loading players from:", p);
          players = JSON.parse(fs.readFileSync(p, "utf-8"));
          break;
        }
      }
    } catch (err) {
      console.error("Failed to load players from JSON, using fallback", err);
    }

    if (players.length === 0) {
      players = [
        { id: 101, name: "Virat Kohli", role: "Batsman", country: "IND", basePrice: 200, img: "/src/assets/virat kohli.jpg", form: 95, clutch: 98, versatility: 85, expectedValue: 18.5, rarity: "Legend", status: "POOL" },
      ];
    }

    return {
      sessionId: "GAME_" + Math.random().toString(36).substring(7).toUpperCase(),
      status: "WAITING",
      round: "MARQUEE",
      mode: "SINGLEPLAYER",
      roomCode: null,
      aiSpeed: 1,
      userTeamId: null,
      currentPlayer: null,
      currentBid: 0,
      highestBidderId: null,
      timeLeft: 12,
      logs: [],
      playerPool: players,
      chat: [],
      teams: [
        { id: 1, name: "RCB", purse: 120, spent: 0, squad: [], isAI: true, rtmCards: 6 },
        { id: 2, name: "CSK", purse: 120, spent: 0, squad: [], isAI: true, rtmCards: 6 },
        { id: 3, name: "MI", purse: 120, spent: 0, squad: [], isAI: true, rtmCards: 6 },
        { id: 4, name: "KKR", purse: 120, spent: 0, squad: [], isAI: true, rtmCards: 6 },
        { id: 5, name: "SRH", purse: 120, spent: 0, squad: [], isAI: true, rtmCards: 6 },
        { id: 6, name: "DC", purse: 120, spent: 0, squad: [], isAI: true, rtmCards: 6 },
        { id: 7, name: "RR", purse: 120, spent: 0, squad: [], isAI: true, rtmCards: 6 },
        { id: 8, name: "PBKS", purse: 120, spent: 0, squad: [], isAI: true, rtmCards: 6 },
        { id: 9, name: "GT", purse: 120, spent: 0, squad: [], isAI: true, rtmCards: 6 },
        { id: 10, name: "LSG", purse: 120, spent: 0, squad: [], isAI: true, rtmCards: 6 },
      ]
    };
  }

  createRoom() {
    const code = "IPL-" + Math.floor(1000 + Math.random() * 9000);
    this.state.mode = "MULTIPLAYER";
    this.state.roomCode = code;
    this.addLog(`🎮 Multiplayer Room Created! Room Code: ${code}`, "system");
    this.emit("update", this.state);
    return { roomCode: code };
  }

  joinRoom(code: string, teamId?: number) {
    if (!this.state.roomCode || this.state.roomCode.toUpperCase() === code.toUpperCase()) {
      this.state.mode = "MULTIPLAYER";
      this.state.roomCode = code.toUpperCase();
      if (teamId) {
        const team = this.state.teams.find(t => t.id === teamId);
        if (team) {
          team.isAI = false;
          this.addLog(`👥 User joined room ${code} as ${team.name}`, "system");
        }
      }
      this.emit("update", this.state);
      return { success: true, roomCode: this.state.roomCode };
    }
    return { success: false, error: "Invalid Room Code" };
  }

  setAiSpeed(speed: number) {
    this.state.aiSpeed = speed;
    if (this.state.status === "ACTIVE") {
      this.startAI();
    }
    this.addLog(`⚡ AI Bidding Speed set to ${speed === 3 ? 'Turbo (0.4s)' : speed === 2 ? 'Fast (0.8s)' : 'Normal (1.6s)'}`, "system");
    this.emit("update", this.state);
  }

  getState() {
    return this.state;
  }

  sendChatMessage(user: string, team: string, msg: string) {
    this.state.chat.unshift({
      id: Date.now(),
      user,
      team,
      msg,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    this.state.chat = this.state.chat.slice(0, 50);
    this.emit("update", this.state);
  }

  selectTeam(teamId: number) {
    if (this.state.status !== "WAITING") return;
    const team = this.state.teams.find(t => t.id === teamId);
    if (team) {
      team.isAI = false;
      this.state.userTeamId = teamId;
      this.addLog(`User selected ${team.name}. Initialized 9 AI Strategy Franchise Bots. Rules: Min 18 / Max 25 Players, Max 8 Overseas, ₹120.00 Cr Purse.`, "system");
      this.emit("update", this.state);
    }
  }

  start() {
    if (this.state.status !== "WAITING" || this.state.userTeamId === null) return;
    this.loadNextPlayer();
  }

  pause() {
    if (this.state.status === "ACTIVE") {
      this.state.status = "PAUSED";
      if (this.timer) clearInterval(this.timer);
      if (this.aiInterval) clearInterval(this.aiInterval);
      this.addLog("Auction PAUSED by user", "system");
      this.emit("update", this.state);
    }
  }

  resume() {
    if (this.state.status === "PAUSED") {
      this.state.status = "ACTIVE";
      this.startTimer();
      this.startAI();
      this.addLog("Auction RESUMED", "system");
      this.emit("update", this.state);
    }
  }

  private loadNextPlayer() {
    let next = this.state.playerPool.find(p => p.status === "POOL");
    if (!next) {
      // Check if unsold players exist for Accelerated Round
      const unsoldList = this.state.playerPool.filter(p => p.status === "UNSOLD");
      if (unsoldList.length > 0 && this.state.round !== "ACCELERATED") {
        this.state.round = "ACCELERATED";
        this.addLog("⚡ ACCELERATED ROUND INITIATED: Unsold players re-entering pool at 50% base price!", "system");
        unsoldList.forEach(p => {
          p.status = "POOL";
          p.basePrice = Math.max(20, Math.floor((p.basePrice || 200) / 2));
        });
        next = this.state.playerPool.find(p => p.status === "POOL");
      }
    }

    if (!next) {
      this.state.status = "FINISHED";
      this.state.round = "FINISHED";
      this.addLog("🏆 MEGA AUCTION COMPLETE! All franchise rosters finalized.", "system");
      this.emit("update", this.state);
      return;
    }

    next.status = "ACTIVE";
    this.state.currentPlayer = next;
    this.state.currentBid = 0;
    this.state.highestBidderId = null;
    this.state.status = "ACTIVE";
    this.state.timeLeft = 12;
    
    this.addLog(`${next.name} (${next.role}, ${next.country}) is now ON STAGE. Base Price: ₹${(next.basePrice/100).toFixed(2)} Cr`, "system");
    this.startTimer();
    
    // Trigger instant opening bid by an interested AI franchise
    setTimeout(() => {
      if (this.state.status === "ACTIVE" && this.state.currentBid === 0) {
        const eligible = this.state.teams.filter(t => t.isAI && t.purse > 2.0);
        if (eligible.length > 0) {
          const opener = eligible[Math.floor(Math.random() * eligible.length)];
          this.placeBid(opener.id);
        }
      }
    }, 400);

    this.startAI();
    this.emit("update", this.state);
  }

  private startTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (this.state.timeLeft > 0) {
        this.state.timeLeft--;
        this.emit("update", this.state);
      } else {
        this.handleTimeout();
      }
    }, 1000);
  }

  private startAI() {
    if (this.aiInterval) clearInterval(this.aiInterval);
    const intervalMs = this.state.aiSpeed === 3 ? 300 : this.state.aiSpeed === 2 ? 600 : 1000;

    this.aiInterval = setInterval(() => {
      this.triggerAiReaction();
    }, intervalMs);
  }

  private triggerAiReaction() {
    if (this.state.status !== "ACTIVE" || !this.state.currentPlayer) return;
    
    const p = this.state.currentPlayer;
    const isOverseas = p.country && p.country.toLowerCase() !== "india" && p.country.toLowerCase() !== "ind";

    // Filter eligible AI teams obeying official IPL rules
    const aiTeams = this.state.teams.filter(t => {
      if (!t.isAI || t.id === this.state.highestBidderId) return false;
      if (t.squad.length >= 25) return false; // Max 25 players
      
      const overseasCount = t.squad.filter(sp => sp.country && sp.country.toLowerCase() !== "india" && sp.country.toLowerCase() !== "ind").length;
      if (isOverseas && overseasCount >= 8) return false; // Max 8 overseas

      // Minimum purse reservation check
      const slotsNeeded = Math.max(0, 18 - t.squad.length - 1);
      const minReserveCr = (slotsNeeded * 20) / 100;
      if (t.purse - minReserveCr < 0.2) return false;

      return true;
    });

    if (aiTeams.length === 0) return;

    const currentPriceCr = this.state.currentBid === 0 ? (p.basePrice || 200) / 100 : this.state.currentBid / 100;
    const expValue = p.expectedValue || ((p.basePrice || 200) / 100 * 2.5);

    // Filter AI teams willing to bid up to market expected value (+ margin for star players)
    const interested = aiTeams.filter(t => {
      const budgetCap = Math.min(t.purse * 0.45, expValue * (1.15 + Math.random() * 0.25));
      return currentPriceCr < budgetCap;
    });

    if (interested.length > 0) {
      const bidder = interested[Math.floor(Math.random() * interested.length)];
      this.placeBid(bidder.id);
    }
  }

  private handleTimeout() {
    if (this.timer) clearInterval(this.timer);
    if (this.aiInterval) clearInterval(this.aiInterval);

    if (this.state.highestBidderId) {
      this.state.status = "SOLD";
      const team = this.state.teams.find(t => t.id === this.state.highestBidderId);
      if (team && this.state.currentPlayer) {
        const finalPriceCr = (this.state.currentBid / 100);
        team.purse = Number((team.purse - finalPriceCr).toFixed(2));
        team.spent = Number((team.spent + finalPriceCr).toFixed(2));
        
        const boughtPlayer = { ...this.state.currentPlayer, status: "SOLD" as const, boughtBy: team.name, salePrice: finalPriceCr };
        team.squad.push(boughtPlayer);
        
        // Update master pool status
        const poolPlayer = this.state.playerPool.find(p => p.id === boughtPlayer.id);
        if (poolPlayer) {
          poolPlayer.status = "SOLD";
          poolPlayer.boughtBy = team.name;
          poolPlayer.salePrice = finalPriceCr;
        }

        this.addLog(`🔨 SOLD! ${boughtPlayer.name} to ${team.name} for ₹${finalPriceCr.toFixed(2)} Cr`, "sold");
      }
    } else {
      this.state.status = "UNSOLD";
      if (this.state.currentPlayer) {
        this.state.currentPlayer.status = "UNSOLD";
        const poolPlayer = this.state.playerPool.find(p => p.id === this.state.currentPlayer?.id);
        if (poolPlayer) poolPlayer.status = "UNSOLD";
      }
      this.addLog(`❌ UNSOLD! ${this.state.currentPlayer?.name} went un-auctioned`, "unsold");
    }
    this.emit("update", this.state);
    setTimeout(() => this.loadNextPlayer(), 3000);
  }

  placeBid(teamId: number, customIncrement?: number) {
    if (this.state.status !== "ACTIVE" || !this.state.currentPlayer) return;
    const team = this.state.teams.find(t => t.id === teamId);
    if (!team) return;

    const p = this.state.currentPlayer;
    const isOverseas = p.country && p.country.toLowerCase() !== "india" && p.country.toLowerCase() !== "ind";

    // 1. Max Squad Size Rule (Max 25 players)
    if (team.squad.length >= 25) {
      this.addLog(`⚠️ Bid rejected for ${team.name}: Squad limit of 25 players reached!`, "system");
      return;
    }

    // 2. Overseas Players Limit Rule (Max 8 overseas)
    const overseasCount = team.squad.filter(sp => sp.country && sp.country.toLowerCase() !== "india" && sp.country.toLowerCase() !== "ind").length;
    if (isOverseas && overseasCount >= 8) {
      this.addLog(`⚠️ Bid rejected for ${team.name}: Overseas slot limit of 8 players reached!`, "system");
      return;
    }

    // 3. Official IPL Bidding Slabs
    const basePriceLakhs = p.basePrice || 200;
    const increment = customIncrement || getOfficialIplIncrement(this.state.currentBid || basePriceLakhs);
    const newBidLakhs = this.state.currentBid === 0 ? basePriceLakhs : this.state.currentBid + increment;
    const newBidCr = newBidLakhs / 100;

    // 4. Purse Reserve Rule
    const slotsNeededToReach18 = Math.max(0, 18 - team.squad.length - 1);
    const minReserveCr = (slotsNeededToReach18 * 20) / 100;
    if ((team.purse - newBidCr) < minReserveCr) {
      this.addLog(`⚠️ Bid rejected for ${team.name}: Must reserve ₹${minReserveCr.toFixed(2)} Cr to reach minimum 18 players!`, "system");
      return;
    }

    this.state.currentBid = newBidLakhs;
    this.state.highestBidderId = teamId;
    this.state.timeLeft = 12;
    
    this.addLog(`⚡ ${team.name} raised bid to ₹${newBidCr.toFixed(2)} Cr (+₹${increment}L)`, "bid");
    this.emit("update", this.state);

    // Fast AI reaction counter-bid if user bids
    if (teamId === this.state.userTeamId) {
      setTimeout(() => this.triggerAiReaction(), 400 + Math.random() * 500);
    }
  }

  reset() {
    if (this.timer) clearInterval(this.timer);
    if (this.aiInterval) clearInterval(this.aiInterval);
    this.state = this.getInitialState();
    this.emit("update", this.state);
  }

  private addLog(msg: string, type: string) {
    this.state.logs.unshift({ id: Date.now(), msg, type, time: new Date().toLocaleTimeString() });
    this.state.logs = this.state.logs.slice(0, 50);
  }
}

export const auctionService = new AuctionEngine();
