// CricField Arcade Client Engines & Types
// Provides standalone simulation state and models for browser runtime.

export interface HandCricketBallLog {
  ball: number;
  playerChoice: number;
  computerChoice: number;
  runsScored: number;
  isWicket: boolean;
  commentary: string;
}

export interface HandCricketState {
  overLimit: 1 | 2 | 5;
  totalBalls: number;
  currentInnings: 1 | 2;
  playerBattingFirst: boolean;
  isPlayerBatting: boolean;
  ballsBowled: number;
  runs: number;
  wickets: number;
  maxWickets: number;
  target: number | null;
  history: HandCricketBallLog[];
  isGameOver: boolean;
  winner: "player" | "computer" | "tie" | null;
  resultMessage: string | null;
}

export function initHandCricket(options: {
  overLimit: 1 | 2 | 5;
  playerChoseBat: boolean;
}): HandCricketState {
  const totalBalls = options.overLimit * 6;
  return {
    overLimit: options.overLimit,
    totalBalls,
    currentInnings: 1,
    playerBattingFirst: options.playerChoseBat,
    isPlayerBatting: options.playerChoseBat,
    ballsBowled: 0,
    runs: 0,
    wickets: 0,
    maxWickets: options.overLimit === 1 ? 2 : options.overLimit === 2 ? 3 : 5,
    target: null,
    history: [],
    isGameOver: false,
    winner: null,
    resultMessage: null,
  };
}

export function playHandCricketBall(
  state: HandCricketState,
  playerChoice: number,
  forcedComputerChoice?: number
): HandCricketState {
  if (state.isGameOver) return state;
  if (playerChoice < 1 || playerChoice > 6) return state;

  const nextState: HandCricketState = {
    ...state,
    history: [...state.history],
  };

  const computerChoice =
    forcedComputerChoice != null && forcedComputerChoice >= 1 && forcedComputerChoice <= 6
      ? forcedComputerChoice
      : Math.floor(Math.random() * 6) + 1;

  const ballNum = nextState.ballsBowled + 1;
  const isWicket = playerChoice === computerChoice;
  const runsScored = isWicket ? 0 : nextState.isPlayerBatting ? playerChoice : computerChoice;

  let commentary = "";
  if (isWicket) {
    commentary = nextState.isPlayerBatting
      ? `OUT! Both showed ${playerChoice}! Big wicket falls!`
      : `WICKET! You bowled him with ${playerChoice}! Clean bowled!`;
    nextState.wickets += 1;
  } else {
    commentary = nextState.isPlayerBatting
      ? `You showed ${playerChoice}, Computer showed ${computerChoice} → +${runsScored} runs!`
      : `Computer showed ${computerChoice}, You showed ${playerChoice} → Computer scores ${runsScored}!`;
    nextState.runs += runsScored;
  }

  nextState.ballsBowled = ballNum;
  nextState.history.push({
    ball: ballNum,
    playerChoice,
    computerChoice,
    runsScored,
    isWicket,
    commentary,
  });

  const allOut = nextState.wickets >= nextState.maxWickets;
  const oversCompleted = nextState.ballsBowled >= nextState.totalBalls;

  // Innings 1 Completion Check
  if (nextState.currentInnings === 1) {
    if (allOut || oversCompleted) {
      nextState.currentInnings = 2;
      nextState.target = nextState.runs + 1;
      nextState.isPlayerBatting = !nextState.playerBattingFirst;
      nextState.ballsBowled = 0;
      nextState.runs = 0;
      nextState.wickets = 0;
    }
    return nextState;
  }

  // Innings 2 Chase Check
  if (nextState.currentInnings === 2 && nextState.target != null) {
    const targetReached = nextState.runs >= nextState.target;

    if (targetReached) {
      nextState.isGameOver = true;
      if (nextState.isPlayerBatting) {
        nextState.winner = "player";
        nextState.resultMessage = `Brilliant Chase! You won by ${nextState.maxWickets - nextState.wickets} wickets!`;
      } else {
        nextState.winner = "computer";
        nextState.resultMessage = `Computer chased the target with ${nextState.totalBalls - nextState.ballsBowled} balls remaining!`;
      }
    } else if (allOut || oversCompleted) {
      nextState.isGameOver = true;
      if (nextState.runs === nextState.target - 1) {
        nextState.winner = "tie";
        nextState.resultMessage = "Scores level! It is a thrilling Tie!";
      } else if (nextState.isPlayerBatting) {
        nextState.winner = "computer";
        nextState.resultMessage = `Defended! Computer won by ${nextState.target - 1 - nextState.runs} runs!`;
      } else {
        nextState.winner = "player";
        nextState.resultMessage = `Victory! You successfully defended the target by ${nextState.target - 1 - nextState.runs} runs!`;
      }
    }
  }

  return nextState;
}
