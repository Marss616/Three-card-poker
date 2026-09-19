/**
 * Local simulation engine for Three Card Poker
 * Provides seamless offline / demo mode with identical events to Stake Engine RGS.
 */

import { RGSPlayResponse, RGSEvent, API_MULTIPLIER } from "./rgs";

const SUITS = ["c", "d", "h", "s"];
const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
const RANK_CHARS: Record<number, string> = {
  2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8", 9: "9", 10: "10",
  11: "J", 12: "Q", 13: "K", 14: "A"
};

const HAND_NAMES: Record<number, string> = {
  7: "Mini Royal Flush",
  6: "Straight Flush",
  5: "Three of a Kind",
  4: "Straight",
  3: "Flush",
  2: "Pair",
  1: "High Card"
};

interface Card {
  rank: number;
  suit: string;
  code: string;
}

export class LocalEngine {
  public balance: number = 1000.0;
  private simCount: number = 0;

  private createDeck(): Card[] {
    const deck: Card[] = [];
    for (const r of RANKS) {
      for (const s of SUITS) {
        deck.push({
          rank: r,
          suit: s,
          code: `${RANK_CHARS[r]}${s}`,
        });
      }
    }
    return deck;
  }

  private evaluateHand(cards: Card[]): [number, ...number[]] {
    const ranks = cards.map((c) => c.rank).sort((a, b) => b - a);
    const isFlush = cards[0].suit === cards[1].suit && cards[1].suit === cards[2].suit;

    let isStraight = false;
    let straightHigh = 0;
    if (ranks[0] - ranks[1] === 1 && ranks[1] - ranks[2] === 1) {
      isStraight = true;
      straightHigh = ranks[0];
    } else if (ranks[0] === 14 && ranks[1] === 3 && ranks[2] === 2) {
      isStraight = true;
      straightHigh = 3;
    }

    if (isStraight && isFlush) {
      if (ranks[0] === 14 && ranks[1] === 13 && ranks[2] === 12) {
        return [7, straightHigh, 0, 0];
      }
      return [6, straightHigh, 0, 0];
    }

    const counts: Record<number, number> = {};
    for (const r of ranks) counts[r] = (counts[r] || 0) + 1;
    const countPairs = Object.entries(counts)
      .map(([k, v]) => [parseInt(k), v])
      .sort((a, b) => b[1] - a[1] || b[0] - a[0]);

    if (countPairs[0][1] === 3) {
      return [5, countPairs[0][0], 0, 0];
    }
    if (isStraight) {
      return [4, straightHigh, 0, 0];
    }
    if (isFlush) {
      return [3, ranks[0], ranks[1], ranks[2]];
    }
    if (countPairs[0][1] === 2) {
      return [2, countPairs[0][0], countPairs[1][0], 0];
    }
    return [1, ranks[0], ranks[1], ranks[2]];
  }

  private compareHands(h1: number[], h2: number[]): number {
    for (let i = 0; i < h1.length; i++) {
      if (h1[i] > h2[i]) return 1;
      if (h1[i] < h2[i]) return -1;
    }
    return 0;
  }

  public play(betAmount: number): RGSPlayResponse {
    this.simCount++;
    this.balance -= betAmount;

    // Shuffle and deal 6 cards
    const deck = this.createDeck();
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    const playerCards = deck.slice(0, 3);
    const dealerCards = deck.slice(3, 6);

    const pScore = this.evaluateHand(playerCards);
    const dScore = this.evaluateHand(dealerCards);

    // Dealer qualifies with Queen-6-4 or better:
    // (rank > 1) OR (rank == 1 && (card1 > 12 || (card1 == 12 && (card2 > 6 || (card2 == 6 && card3 >= 4)))))
    const qualifies =
      dScore[0] > 1 ||
      (dScore[0] === 1 &&
        (dScore[1] > 12 ||
          (dScore[1] === 12 && (dScore[2] > 6 || (dScore[2] === 6 && dScore[3] >= 4)))));

    // Ante Bonus
    let anteBonus = 0.0;
    if (pScore[0] === 7) anteBonus = 20.0;
    else if (pScore[0] === 6) anteBonus = 5.0;
    else if (pScore[0] === 5) anteBonus = 4.0;
    else if (pScore[0] === 4) anteBonus = 1.0;

    let payout = 0.0;
    let outcome = "dealer_win";

    if (!qualifies) {
      outcome = "dealer_not_qualify";
      payout = 1.4 + anteBonus;
    } else {
      const cmp = this.compareHands(pScore, dScore);
      if (cmp > 0) {
        outcome = "player_win";
        payout = 2.0 + anteBonus;
      } else if (cmp === 0) {
        outcome = "tie";
        payout = 1.0 + anteBonus;
      } else {
        outcome = "dealer_win";
        payout = anteBonus;
      }
    }

    payout = Math.round(payout * 10) / 10;
    const payoutMultiplier = Math.round(payout * 100);
    const winCredits = betAmount * payout;

    const events: RGSEvent[] = [
      {
        index: 0,
        type: "deal",
        playerCards: playerCards.map((c) => c.code),
        dealerCards: dealerCards.map((c) => c.code),
        playerHand: HAND_NAMES[pScore[0]],
        playerHandRank: pScore[0],
      },
      {
        index: 1,
        type: "showdown",
        dealerHand: HAND_NAMES[dScore[0]],
        dealerHandRank: dScore[0],
        dealerQualifies: qualifies,
        outcome,
        anteBonus,
        totalWin: payoutMultiplier,
      },
      {
        index: 2,
        type: "winInfo",
        totalWin: payoutMultiplier,
      },
      {
        index: 3,
        type: "finalWin",
        amount: payoutMultiplier,
      },
    ];

    return {
      balance: {
        amount: Math.round(this.balance * API_MULTIPLIER),
        currency: "USD",
      },
      round: {
        id: this.simCount,
        payoutMultiplier,
        events,
      },
    };
  }

  public endRound(payoutMultiplier: number, betAmount: number): { balance: { amount: number; currency: string } } {
    const winAmount = betAmount * (payoutMultiplier / 100);
    this.balance += winAmount;
    return {
      balance: {
        amount: Math.round(this.balance * API_MULTIPLIER),
        currency: "USD",
      },
    };
  }
}

export const localEngine = new LocalEngine();

export function createShuffledDeck(): Card[] {
  const deck: Card[] = [];
  for (const r of RANKS) {
    for (const s of SUITS) {
      deck.push({
        rank: r,
        suit: s,
        code: `${RANK_CHARS[r]}${s}`,
      });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function parseCardCode(code: string): Card {
  const clean = code.trim();
  const suit = clean.slice(-1).toLowerCase();
  const rankStr = clean.slice(0, -1).toUpperCase();
  let rank = 2;
  if (rankStr === "A") rank = 14;
  else if (rankStr === "K") rank = 13;
  else if (rankStr === "Q") rank = 12;
  else if (rankStr === "J") rank = 11;
  else rank = parseInt(rankStr) || 2;
  return { rank, suit, code: clean };
}

export function evaluateThreeCardHand(cardsOrCodes: (Card | string)[]): {
  score: number[];
  rankName: string;
  rankCategory: number;
  qualifies: boolean;
  anteBonus: number;
} {
  const cards: Card[] = cardsOrCodes.map((c) =>
    typeof c === "string" ? parseCardCode(c) : c
  );
  const ranks = cards.map((c) => c.rank).sort((a, b) => b - a);
  const isFlush = cards[0].suit === cards[1].suit && cards[1].suit === cards[2].suit;

  let isStraight = false;
  let straightHigh = 0;
  if (ranks[0] - ranks[1] === 1 && ranks[1] - ranks[2] === 1) {
    isStraight = true;
    straightHigh = ranks[0];
  } else if (ranks[0] === 14 && ranks[1] === 3 && ranks[2] === 2) {
    isStraight = true;
    straightHigh = 3;
  }

  let score: number[] = [];
  if (isStraight && isFlush) {
    if (ranks[0] === 14 && ranks[1] === 13 && ranks[2] === 12) {
      score = [7, straightHigh, 0, 0];
    } else {
      score = [6, straightHigh, 0, 0];
    }
  } else {
    const counts: Record<number, number> = {};
    for (const r of ranks) counts[r] = (counts[r] || 0) + 1;
    const countPairs = Object.entries(counts)
      .map(([k, v]) => [parseInt(k), v])
      .sort((a, b) => b[1] - a[1] || b[0] - a[0]);

    if (countPairs[0][1] === 3) {
      score = [5, countPairs[0][0], 0, 0];
    } else if (isStraight) {
      score = [4, straightHigh, 0, 0];
    } else if (isFlush) {
      score = [3, ranks[0], ranks[1], ranks[2]];
    } else if (countPairs[0][1] === 2) {
      score = [2, countPairs[0][0], countPairs[1][0], 0];
    } else {
      score = [1, ranks[0], ranks[1], ranks[2]];
    }
  }

  const rankCategory = score[0];
  const rankName = HAND_NAMES[rankCategory] || "High Card";

  // Dealer qualifies: Queen-6-4 or better
  const qualifies =
    score[0] > 1 ||
    (score[0] === 1 &&
      (score[1] > 12 ||
        (score[1] === 12 && (score[2] > 6 || (score[2] === 6 && score[3] >= 4)))));

  let anteBonus = 0;
  if (rankCategory === 7) anteBonus = 20;
  else if (rankCategory === 6) anteBonus = 5;
  else if (rankCategory === 5) anteBonus = 4;
  else if (rankCategory === 4) anteBonus = 1;

  return { score, rankName, rankCategory, qualifies, anteBonus };
}

export function compareThreeCardHands(h1: number[], h2: number[]): number {
  for (let i = 0; i < Math.min(h1.length, h2.length); i++) {
    if (h1[i] > h2[i]) return 1;
    if (h1[i] < h2[i]) return -1;
  }
  return 0;
}

export function generateFallbackRound(targetPayoutMultiplier: number = 0) {
  const deck = createShuffledDeck();
  const playerCards = deck.slice(0, 3).map((c) => c.code);
  const dealerCards = deck.slice(3, 6).map((c) => c.code);

  const pEval = evaluateThreeCardHand(playerCards);
  const dEval = evaluateThreeCardHand(dealerCards);

  let outcome = "dealer_win";
  let payoutMult = targetPayoutMultiplier;

  if (!dEval.qualifies) {
    outcome = "dealer_not_qualify";
    if (payoutMult === 0) payoutMult = Math.round((1.4 + pEval.anteBonus) * 100);
  } else {
    const cmp = compareThreeCardHands(pEval.score, dEval.score);
    if (cmp > 0) {
      outcome = "player_win";
      if (payoutMult === 0) payoutMult = Math.round((2.0 + pEval.anteBonus) * 100);
    } else if (cmp === 0) {
      outcome = "tie";
      if (payoutMult === 0) payoutMult = Math.round((1.0 + pEval.anteBonus) * 100);
    } else {
      outcome = "dealer_win";
      if (payoutMult === 0 && pEval.anteBonus > 0) {
        payoutMult = Math.round(pEval.anteBonus * 100);
      }
    }
  }

  return {
    playerCards,
    dealerCards,
    playerHandName: pEval.rankName,
    dealerHandName: dEval.rankName,
    dealerQualifies: dEval.qualifies,
    outcome,
    anteBonus: pEval.anteBonus,
    payoutMultiplier: payoutMult,
  };
}
