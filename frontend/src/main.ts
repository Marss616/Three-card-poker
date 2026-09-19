import { rgs, API_MULTIPLIER } from "./rgs";
import {
  localEngine,
  generateFallbackRound,
  evaluateThreeCardHand,
  compareThreeCardHands,
} from "./engine";
import { sound } from "./audio";

// Suits mapping for display
const SUIT_ICONS: Record<string, string> = {
  h: "♥",
  d: "♦",
  c: "♣",
  s: "♠",
};

const SUIT_COLORS: Record<string, string> = {
  h: "red",
  d: "red",
  c: "black",
  s: "black",
};

interface GameState {
  balance: number;
  currency: string;
  betAmount: number;
  stage: "IDLE" | "PLAYING";
  currentRound: any | null;
  lastPayoutMult: number;
}

const state: GameState = {
  balance: 1000.0,
  currency: "USD",
  betAmount: 1.0,
  stage: "IDLE",
  currentRound: null,
  lastPayoutMult: 0,
};

// Safe DOM element references
let elBalance: HTMLElement | null = null;
let elCurrency: HTMLElement | null = null;
let elStatusBadge: HTMLElement | null = null;
let elDealerCards: HTMLElement | null = null;
let elPlayerCards: HTMLElement | null = null;
let elDealerHandBadge: HTMLElement | null = null;
let elPlayerHandBadge: HTMLElement | null = null;
let elSpotAnte: HTMLElement | null = null;
let elSpotPlay: HTMLElement | null = null;
let elAnteAmount: HTMLElement | null = null;
let elPlayAmount: HTMLElement | null = null;
let elBetValue: HTMLElement | null = null;
let elDealBtn: HTMLButtonElement | null = null;
let elResultBanner: HTMLElement | null = null;
let elResultTitle: HTMLElement | null = null;
let elResultDetail: HTMLElement | null = null;
let elResultPayout: HTMLElement | null = null;
let elPaytableModal: HTMLElement | null = null;

function initElements() {
  elBalance = document.getElementById("balanceVal");
  elCurrency = document.getElementById("balanceCurrency");
  elStatusBadge = document.getElementById("statusBadge");
  elDealerCards = document.getElementById("dealerCards");
  elPlayerCards = document.getElementById("playerCards");
  elDealerHandBadge = document.getElementById("dealerHandBadge");
  elPlayerHandBadge = document.getElementById("playerHandBadge");
  elSpotAnte = document.getElementById("spotAnte");
  elSpotPlay = document.getElementById("spotPlay");
  elAnteAmount = document.getElementById("anteAmount");
  elPlayAmount = document.getElementById("playAmount");
  elBetValue = document.getElementById("betValueDisplay");
  elDealBtn = document.getElementById("dealBtn") as HTMLButtonElement;
  elResultBanner = document.getElementById("resultBanner");
  elResultTitle = document.getElementById("resultTitle");
  elResultDetail = document.getElementById("resultDetail");
  elResultPayout = document.getElementById("resultPayout");
  elPaytableModal = document.getElementById("paytableModal");
}

function formatMoney(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function updateBalanceUI() {
  if (elBalance) elBalance.textContent = formatMoney(state.balance);
  if (elCurrency) elCurrency.textContent = state.currency;
}

function updateBetUI() {
  if (elBetValue) elBetValue.textContent = `$${formatMoney(state.betAmount)}`;
  if (elAnteAmount) elAnteAmount.textContent = `$${formatMoney(state.betAmount)}`;
  if (elSpotAnte) {
    elSpotAnte.classList.add("active");
    elSpotAnte.innerHTML = `<div class="placed-chip chip-1">$${state.betAmount >= 1 ? state.betAmount : state.betAmount.toFixed(1)}</div>`;
  }
}

// Dismiss the result banner
function dismissBanner() {
  if (elResultBanner && elResultBanner.classList.contains("visible")) {
    elResultBanner.classList.remove("visible");
  }
}

// Normalize any card input safely into standard format like "4c", "As", "10d"
function normalizeCardCode(cardInput: any): string {
  if (!cardInput) return "As";
  if (typeof cardInput === "string") {
    const trimmed = cardInput.trim();
    if (trimmed.length >= 2) return trimmed;
  }
  if (typeof cardInput === "object") {
    const r = cardInput.rank || cardInput.value || "A";
    const s = cardInput.suit || "s";
    return `${r}${s}`;
  }
  return "As";
}

// Create Card DOM Element (Crash-proof: will NEVER throw)
function createCardElement(cardCode: any, isFaceUp: boolean = false): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = `card-wrapper dealt ${isFaceUp ? "flipped" : ""}`;

  const safe = normalizeCardCode(cardCode);
  const suit = safe.slice(-1).toLowerCase();
  const rank = safe.slice(0, -1).toUpperCase();
  const color = SUIT_COLORS[suit] || "black";
  const icon = SUIT_ICONS[suit] || "♠";

  wrapper.innerHTML = `
    <div class="card-inner">
      <div class="card-face card-back">
        <div class="card-pattern"></div>
      </div>
      <div class="card-face card-front ${color}">
        <div class="card-corner top">
          <span class="card-rank">${rank}</span>
          <span class="card-suit-mini">${icon}</span>
        </div>
        <div class="card-center-suit">${icon}</div>
        <div class="card-corner bottom">
          <span class="card-rank">${rank}</span>
          <span class="card-suit-mini">${icon}</span>
        </div>
      </div>
    </div>
  `;
  return wrapper;
}

// Reset Table Felt
function resetTable() {
  dismissBanner();
  if (elDealerCards) elDealerCards.innerHTML = "";
  if (elPlayerCards) elPlayerCards.innerHTML = "";
  if (elDealerHandBadge) {
    elDealerHandBadge.textContent = "";
    elDealerHandBadge.classList.remove("visible");
  }
  if (elPlayerHandBadge) {
    elPlayerHandBadge.textContent = "";
    elPlayerHandBadge.classList.remove("visible");
  }
  if (elSpotPlay) {
    elSpotPlay.classList.remove("active");
    elSpotPlay.innerHTML = "";
  }
  if (elPlayAmount) elPlayAmount.textContent = "$0.00";
}

interface ParsedRoundData {
  id: string | number;
  payoutMultiplier: number;
  playerCards: string[];
  dealerCards: string[];
  playerHandName: string;
  dealerHandName: string;
  dealerQualifies: boolean;
  outcome: string;
  anteBonus: number;
}

/**
 * Defensive parsing of Stake Engine RGS play response.
 * Handles any response shape (nested, stringified, or missing events)
 * and guarantees 3 valid player cards and 3 dealer cards.
 */
function parseRoundData(response: any): ParsedRoundData {
  try {
    let resp = response;
    if (typeof resp === "string") {
      try {
        resp = JSON.parse(resp);
      } catch (_) {}
    }

    let round = resp?.round ?? resp?.data ?? resp ?? {};
    if (typeof round === "string") {
      try {
        round = JSON.parse(round);
      } catch (_) {}
    }

    // Inspect all possible event array locations
    let rawEvents: any = null;
    if (Array.isArray(round?.events)) rawEvents = round.events;
    else if (Array.isArray(round?.state?.events)) rawEvents = round.state.events;
    else if (Array.isArray(round?.state)) rawEvents = round.state;
    else if (Array.isArray(round?.book?.events)) rawEvents = round.book.events;
    else if (Array.isArray(round?.book)) rawEvents = round.book;
    else if (Array.isArray(resp?.events)) rawEvents = resp.events;
    else if (typeof round?.events === "string") {
      try {
        rawEvents = JSON.parse(round.events);
      } catch (_) {}
    } else if (typeof round?.state === "string") {
      try {
        rawEvents = JSON.parse(round.state);
      } catch (_) {}
    }

    const events: any[] = Array.isArray(rawEvents) ? rawEvents : [];

    // Find deal event
    const dealEvent = events.find(
      (e: any) =>
        e &&
        (e.type === "deal" ||
          e.type === "DEAL" ||
          e.playerCards ||
          e.player_cards)
    );

    // Extract cards
    let playerCards: string[] = [];
    let dealerCards: string[] = [];

    if (dealEvent) {
      const pRaw = dealEvent.playerCards || dealEvent.player_cards || dealEvent.cards;
      if (Array.isArray(pRaw)) {
        playerCards = pRaw.map(normalizeCardCode).filter(Boolean);
      }
      const dRaw = dealEvent.dealerCards || dealEvent.dealer_cards;
      if (Array.isArray(dRaw)) {
        dealerCards = dRaw.map(normalizeCardCode).filter(Boolean);
      }
    }

    // Showdown event
    const showdownEvent = events.find(
      (e: any) =>
        e &&
        (e.type === "showdown" ||
          e.type === "SHOWDOWN" ||
          e.dealerHand ||
          e.outcome)
    );

    // Extract payout multiplier (100 = 1x wager back, 200 = 2x win, etc.)
    let payoutMultiplier = 0;
    if (typeof round?.payoutMultiplier === "number") {
      payoutMultiplier = round.payoutMultiplier;
    } else if (typeof showdownEvent?.totalWin === "number") {
      payoutMultiplier = showdownEvent.totalWin;
    } else if (typeof round?.totalWin === "number") {
      payoutMultiplier = round.totalWin;
    } else if (typeof round?.multiplier === "number") {
      payoutMultiplier = round.multiplier > 10 ? round.multiplier : Math.round(round.multiplier * 100);
    }

    // If cards are missing or fewer than 3, generate fallback hands matching payout!
    if (playerCards.length < 3 || dealerCards.length < 3) {
      const fallback = generateFallbackRound(payoutMultiplier);
      if (playerCards.length < 3) playerCards = fallback.playerCards;
      if (dealerCards.length < 3) dealerCards = fallback.dealerCards;
    }

    // Evaluate hands for accurate names and qualification
    const pEval = evaluateThreeCardHand(playerCards);
    const dEval = evaluateThreeCardHand(dealerCards);

    const playerHandName = dealEvent?.playerHand || pEval.rankName;
    const dealerHandName = showdownEvent?.dealerHand || dEval.rankName;
    const dealerQualifies =
      showdownEvent?.dealerQualifies !== undefined
        ? Boolean(showdownEvent.dealerQualifies)
        : dEval.qualifies;

    let outcome = showdownEvent?.outcome;
    if (!outcome) {
      if (!dealerQualifies) {
        outcome = "dealer_not_qualify";
      } else {
        const cmp = compareThreeCardHands(pEval.score, dEval.score);
        outcome = cmp > 0 ? "player_win" : cmp === 0 ? "tie" : "dealer_win";
      }
    }

    const anteBonus = showdownEvent?.anteBonus ?? pEval.anteBonus;

    return {
      id: round?.id ?? Date.now(),
      payoutMultiplier,
      playerCards,
      dealerCards,
      playerHandName,
      dealerHandName,
      dealerQualifies,
      outcome,
      anteBonus,
    };
  } catch (err) {
    console.warn("parseRoundData fallback due to error:", err);
    return generateFallbackRound(0) as any;
  }
}

// Complete Deal & Showdown Loop with Guaranteed Error Recovery
async function handleDeal() {
  if (state.stage !== "IDLE") return;
  if (state.balance < state.betAmount) {
    alert("Insufficient balance!");
    return;
  }

  state.stage = "PLAYING";
  dismissBanner();
  resetTable();

  if (elDealBtn) {
    elDealBtn.disabled = true;
    elDealBtn.innerHTML = `<span>DEALING...</span>`;
  }

  sound.playChip();

  try {
    let response: any = null;

    try {
      if (rgs.isConnected) {
        response = await rgs.play(state.betAmount);
        if (response?.balance?.amount != null) {
          state.balance = response.balance.amount / API_MULTIPLIER;
        }
      } else {
        response = localEngine.play(state.betAmount);
        if (response?.balance?.amount != null) {
          state.balance = response.balance.amount / API_MULTIPLIER;
        }
      }
    } catch (err) {
      console.error("Play network error:", err);
      alert("Failed to place bet. Check connection.");
      return; // Will jump to finally block to reset DEAL button!
    }

    updateBalanceUI();

    // Safely parse round data (guaranteed 3 cards for each side)
    const roundData = parseRoundData(response);
    state.currentRound = roundData;
    const {
      playerCards,
      dealerCards,
      playerHandName,
      dealerHandName,
      dealerQualifies,
      outcome,
      anteBonus,
      payoutMultiplier,
    } = roundData;

    // Deal 3 player cards and 3 dealer cards (face down)
    for (let i = 0; i < 3; i++) {
      await new Promise((r) => setTimeout(r, 120));
      sound.playCardDeal();
      if (elPlayerCards) {
        const pCardEl = createCardElement(playerCards[i], false);
        elPlayerCards.appendChild(pCardEl);
      }
      if (elDealerCards) {
        const dCardEl = createCardElement(dealerCards[i], false);
        elDealerCards.appendChild(dCardEl);
      }
    }

    // Flip player cards face up
    await new Promise((r) => setTimeout(r, 150));
    if (elPlayerCards) {
      const playerCardEls = elPlayerCards.querySelectorAll(".card-wrapper");
      playerCardEls.forEach((el, idx) => {
        setTimeout(() => {
          sound.playCardFlip();
          el.classList.add("flipped");
        }, idx * 100);
      });
    }

    await new Promise((r) => setTimeout(r, 350));
    if (elPlayerHandBadge) {
      elPlayerHandBadge.textContent = playerHandName;
      elPlayerHandBadge.classList.add("visible");
    }

    // Place Play Bet visual chip
    sound.playChip();
    if (elSpotPlay) {
      elSpotPlay.classList.add("active");
      elSpotPlay.innerHTML = `<div class="placed-chip chip-1">$${state.betAmount >= 1 ? state.betAmount : state.betAmount.toFixed(1)}</div>`;
    }
    if (elPlayAmount) elPlayAmount.textContent = `$${formatMoney(state.betAmount)}`;

    // Reveal Dealer Cards
    await new Promise((r) => setTimeout(r, 250));
    if (elDealerCards) {
      const dealerCardEls = elDealerCards.querySelectorAll(".card-wrapper");
      for (let i = 0; i < dealerCardEls.length; i++) {
        await new Promise((y) => setTimeout(y, 140));
        sound.playCardFlip();
        dealerCardEls[i].classList.add("flipped");
      }
    }

    if (elDealerHandBadge) {
      elDealerHandBadge.textContent = `${dealerHandName} (${dealerQualifies ? "Qualifies" : "No Qualify"})`;
      elDealerHandBadge.classList.add("visible");
    }

    await new Promise((r) => setTimeout(r, 300));

    // Determine Result Announcement
    const totalWinAmount = state.betAmount * (payoutMultiplier / 100);

    if (payoutMultiplier > 100) {
      sound.playWin();
      if (elResultTitle) {
        elResultTitle.textContent =
          outcome === "dealer_not_qualify"
            ? "DEALER DOES NOT QUALIFY!"
            : "YOU WIN!";
        elResultTitle.className = "result-title win";
      }
      const bonusText = anteBonus > 0 ? ` + Ante Bonus (+${anteBonus}x)` : "";
      if (elResultDetail) {
        elResultDetail.textContent =
          outcome === "dealer_not_qualify"
            ? `Ante pays 1.4x${bonusText}`
            : `Player beats Dealer${bonusText}`;
      }
      if (elResultPayout) {
        elResultPayout.textContent = `Won: $${formatMoney(totalWinAmount)} (${(payoutMultiplier / 100).toFixed(1)}x)`;
      }
    } else if (payoutMultiplier === 100) {
      sound.playPush();
      if (elResultTitle) {
        elResultTitle.textContent = "PUSH (TIE)";
        elResultTitle.className = "result-title tie";
      }
      if (elResultDetail) elResultDetail.textContent = "Equal hands - wager returned";
      if (elResultPayout) elResultPayout.textContent = `Returned: $${formatMoney(totalWinAmount)}`;
    } else {
      sound.playPush();
      if (elResultTitle) {
        elResultTitle.textContent = "DEALER WINS";
        elResultTitle.className = "result-title lose";
      }
      if (elResultDetail) {
        elResultDetail.textContent =
          anteBonus > 0
            ? "Dealer wins, but Ante Bonus awarded!"
            : `Dealer's ${dealerHandName} wins`;
      }
      if (elResultPayout) {
        elResultPayout.textContent =
          totalWinAmount > 0 ? `Bonus Won: $${formatMoney(totalWinAmount)}` : "Payout: $0.00";
      }
    }

    if (elResultBanner) elResultBanner.classList.add("visible");

    // Settle round with RGS end-round
    try {
      if (rgs.isConnected) {
        const confirmation = await rgs.endRound();
        if (confirmation?.balance?.amount != null) {
          state.balance = confirmation.balance.amount / API_MULTIPLIER;
        }
      } else {
        const confirmation = localEngine.endRound(payoutMultiplier, state.betAmount);
        if (confirmation?.balance?.amount != null) {
          state.balance = confirmation.balance.amount / API_MULTIPLIER;
        }
      }
    } catch (err) {
      console.warn("End round warning:", err);
    }
  } catch (criticalErr) {
    console.error("Critical error during deal sequence:", criticalErr);
  } finally {
    updateBalanceUI();
    state.stage = "IDLE";
    if (elDealBtn) {
      elDealBtn.disabled = false;
      elDealBtn.innerHTML = `<span>DEAL AGAIN</span>`;
    }
  }
}

// Setup Event Listeners
function setupEvents() {
  elDealBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    handleDeal();
  });

  // Dismiss result banner when clicking ANYWHERE on the document or the banner itself
  elResultBanner?.addEventListener("click", () => {
    dismissBanner();
  });
  document.addEventListener("click", () => {
    dismissBanner();
  });
  document.addEventListener("touchstart", () => {
    dismissBanner();
  });

  // Chips
  const chipButtons = document.querySelectorAll(".chip-btn");
  chipButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      dismissBanner();
      if (state.stage !== "IDLE") return;
      sound.playChip();
      chipButtons.forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      const val = parseFloat((btn as HTMLElement).dataset.val || "1.0");
      state.betAmount = val;
      updateBetUI();
    });
  });

  // Bet modifiers
  document.getElementById("btnHalf")?.addEventListener("click", (e) => {
    e.stopPropagation();
    dismissBanner();
    if (state.stage !== "IDLE") return;
    sound.playChip();
    state.betAmount = Math.max(0.1, Math.round((state.betAmount / 2) * 10) / 10);
    updateBetUI();
  });

  document.getElementById("btnDouble")?.addEventListener("click", (e) => {
    e.stopPropagation();
    dismissBanner();
    if (state.stage !== "IDLE") return;
    sound.playChip();
    state.betAmount = Math.min(100, Math.round(state.betAmount * 2 * 10) / 10);
    updateBetUI();
  });

  // Sound toggle
  const soundBtn = document.getElementById("soundToggleBtn");
  soundBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    const enabled = sound.toggleMute();
    soundBtn.textContent = enabled ? "🔊" : "🔇";
  });

  // Modal
  document.getElementById("rulesBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    elPaytableModal?.classList.add("open");
  });

  document.getElementById("closeModalBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    elPaytableModal?.classList.remove("open");
  });

  elPaytableModal?.addEventListener("click", (e) => {
    if (e.target === elPaytableModal) {
      elPaytableModal?.classList.remove("open");
    }
  });
}

// Initializer
async function init() {
  initElements();
  setupEvents();
  updateBetUI();

  if (rgs.isConnected) {
    try {
      const auth = await rgs.authenticate();
      state.balance = auth.balance.amount / API_MULTIPLIER;
      state.currency = auth.balance.currency || "USD";
      if (elStatusBadge) {
        elStatusBadge.textContent = "Stake RGS Connected";
        elStatusBadge.classList.add("connected");
      }
    } catch (err) {
      console.warn("RGS authentication failed, falling back to demo mode:", err);
      if (elStatusBadge) elStatusBadge.textContent = "Demo Mode";
    }
  } else {
    if (elStatusBadge) elStatusBadge.textContent = "Demo Mode";
  }

  updateBalanceUI();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
