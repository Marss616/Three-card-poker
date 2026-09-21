import { rgs, API_MULTIPLIER, formatCurrencyAmount } from "./rgs";
import {
  localEngine,
  generateFallbackRound,
  evaluateThreeCardHand,
  compareThreeCardHands,
} from "./engine";
import { sound } from "./audio";
import { getTranslations, Translations } from "./i18n";

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
  minBet: number;
  maxBet: number;
  stepBet: number;
  defaultBet: number;
  betLevels: number[];
  stage: "IDLE" | "PLAYING" | "REPLAY";
  currentRound: any | null;
  lastPayoutMult: number;
  // Auto Play
  isAutoPlaying: boolean;
  autoRoundsRemaining: number;
  autoStartBalance: number;
  autoLossLimit: number | null;
  autoWinLimit: number | null;
  selectedAutoRounds: number;
  // High bet confirmation threshold
  highBetThreshold: number;
  pendingHighBetAmount: number | null;
  // i18n
  t: Translations;
}

const state: GameState = {
  balance: 1000.0,
  currency: "USD",
  betAmount: 1.0,
  minBet: 0.1,
  maxBet: 1000.0,
  stepBet: 0.1,
  defaultBet: 1.0,
  betLevels: [0.1, 0.5, 1.0, 5.0, 25.0, 100.0],
  stage: "IDLE",
  currentRound: null,
  lastPayoutMult: 0,
  isAutoPlaying: false,
  autoRoundsRemaining: 0,
  autoStartBalance: 1000.0,
  autoLossLimit: null,
  autoWinLimit: null,
  selectedAutoRounds: 10,
  highBetThreshold: 50.0,
  pendingHighBetAmount: null,
  t: getTranslations("en", false),
};

// Safe DOM references
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
let elChipsRow: HTMLElement | null = null;
let elSoundToggleBtn: HTMLButtonElement | null = null;
let elAutoPlayBtn: HTMLButtonElement | null = null;

// Replay DOM elements
let elReplayHeaderBar: HTMLElement | null = null;
let elReplayBetCost: HTMLElement | null = null;
let elReplayMultiplier: HTMLElement | null = null;
let elReplayPayoutVal: HTMLElement | null = null;
let elBtnReplayAgain: HTMLButtonElement | null = null;

// Modals
let elPaytableModal: HTMLElement | null = null;
let elAutoPlayModal: HTMLElement | null = null;
let elHighBetModal: HTMLElement | null = null;

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
  elChipsRow = document.getElementById("chipsRow");
  elSoundToggleBtn = document.getElementById("soundToggleBtn") as HTMLButtonElement;
  elAutoPlayBtn = document.getElementById("autoPlayBtn") as HTMLButtonElement;

  elReplayHeaderBar = document.getElementById("replayHeaderBar");
  elReplayBetCost = document.getElementById("replayBetCost");
  elReplayMultiplier = document.getElementById("replayMultiplier");
  elReplayPayoutVal = document.getElementById("replayPayoutVal");
  elBtnReplayAgain = document.getElementById("btnReplayAgain") as HTMLButtonElement;

  elPaytableModal = document.getElementById("paytableModal");
  elAutoPlayModal = document.getElementById("autoPlayModal");
  elHighBetModal = document.getElementById("highBetModal");
}

function applyTranslations() {
  state.t = getTranslations(rgs.lang, rgs.isSocialMode);

  const setTxt = (id: string, text: string) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setTxt("txtGameTitle", state.t.gameTitle);
  setTxt("txtBalanceLabel", state.t.balance);
  setTxt("txtSpotAnte", state.t.ante);
  setTxt("txtSpotPlay", state.t.play);
  setTxt("txtAutoPlayBtn", state.t.autoPlay);
  setTxt("txtAutoModalTitle", `${state.t.autoPlay} Configuration`);
  setTxt("txtStartAutoBtn", state.t.startAuto);
  setTxt("txtReplayBadge", state.t.replayMode);
  setTxt("txtReplayAgain", state.t.replayAgain);
  setTxt("txtReplayCostLabel", `${state.t.cost}:`);
  setTxt("txtReplayMultLabel", `${state.t.multiplier}:`);
  setTxt("txtReplayPayoutLabel", `${state.t.payout}:`);

  if (!state.isAutoPlaying && elDealBtn) {
    const span = elDealBtn.querySelector("span:first-child");
    if (span) span.textContent = state.stage === "IDLE" ? state.t.deal : state.t.dealing;
  }
}

function updateBalanceUI() {
  if (elBalance) elBalance.textContent = formatCurrencyAmount(state.balance, state.currency);
  if (elCurrency) elCurrency.textContent = "";
}

function updateBetUI() {
  const formatted = formatCurrencyAmount(state.betAmount, state.currency);
  if (elBetValue) elBetValue.textContent = formatted;
  if (elAnteAmount) elAnteAmount.textContent = formatted;

  if (elSpotAnte) {
    elSpotAnte.classList.add("active");
    const chipText = state.betAmount >= 1 ? String(Math.floor(state.betAmount)) : state.betAmount.toFixed(1);
    elSpotAnte.innerHTML = `<div class="placed-chip chip-1">${chipText}</div>`;
  }

  // Highlight active chip
  if (elChipsRow) {
    const chipBtns = elChipsRow.querySelectorAll(".chip-btn");
    chipBtns.forEach((btn) => {
      const val = parseFloat((btn as HTMLElement).dataset.val || "0");
      if (Math.abs(val - state.betAmount) < 0.001) {
        btn.classList.add("selected");
      } else {
        btn.classList.remove("selected");
      }
    });
  }
}

function dismissBanner() {
  if (elResultBanner && elResultBanner.classList.contains("visible")) {
    elResultBanner.classList.remove("visible");
  }
}

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
  if (elPlayAmount) elPlayAmount.textContent = formatCurrencyAmount(0, state.currency);
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

    let rawEvents: any = null;
    if (Array.isArray(round?.events)) rawEvents = round.events;
    else if (Array.isArray(round?.state?.events)) rawEvents = round.state.events;
    else if (Array.isArray(round?.state)) rawEvents = round.state;
    else if (Array.isArray(round?.book?.events)) rawEvents = round.book.events;
    else if (Array.isArray(round?.book)) rawEvents = round.book;
    else if (Array.isArray(resp?.events)) rawEvents = resp.events;

    const events: any[] = Array.isArray(rawEvents) ? rawEvents : [];

    const dealEvent = events.find(
      (e: any) => e && (e.type === "deal" || e.type === "DEAL" || e.playerCards || e.player_cards)
    );

    let playerCards: string[] = [];
    let dealerCards: string[] = [];

    if (dealEvent) {
      const pRaw = dealEvent.playerCards || dealEvent.player_cards || dealEvent.cards;
      if (Array.isArray(pRaw)) playerCards = pRaw.map(normalizeCardCode).filter(Boolean);
      const dRaw = dealEvent.dealerCards || dealEvent.dealer_cards;
      if (Array.isArray(dRaw)) dealerCards = dRaw.map(normalizeCardCode).filter(Boolean);
    }

    const showdownEvent = events.find(
      (e: any) => e && (e.type === "showdown" || e.type === "SHOWDOWN" || e.dealerHand || e.outcome)
    );

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

    if (playerCards.length < 3 || dealerCards.length < 3) {
      const fallback = generateFallbackRound(payoutMultiplier);
      if (playerCards.length < 3) playerCards = fallback.playerCards;
      if (dealerCards.length < 3) dealerCards = fallback.dealerCards;
    }

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
    console.warn("parseRoundData fallback:", err);
    return generateFallbackRound(0) as any;
  }
}

/**
 * Executes a round (Deal, Flips, Evaluation, Result, End-Round).
 */
async function handleDeal() {
  if (state.stage !== "IDLE") {
    // If auto playing, clicking Deal button stops auto play
    if (state.isAutoPlaying) {
      stopAutoPlay();
    }
    return;
  }

  // RGS Requirement: Insufficient balance bets do NOT send play request to RGS
  if (state.balance < state.betAmount) {
    if (state.isAutoPlaying) stopAutoPlay();
    showNoticeModal("Insufficient Balance", "Your balance is insufficient to place this wager. Please adjust your wager amount.");
    return;
  }

  state.stage = "PLAYING";
  dismissBanner();
  resetTable();

  if (elDealBtn) {
    elDealBtn.disabled = true;
    elDealBtn.innerHTML = `<span>${state.t.dealing}</span>`;
  }

  sound.playChip();

  try {
    let response: any = null;

    try {
      if (rgs.isConnected) {
        // Send play request to RGS
        response = await rgs.play(state.betAmount);
        if (response?.balance?.amount != null) {
          state.balance = response.balance.amount / API_MULTIPLIER;
        }
      } else {
        // Offline demo mode
        response = localEngine.play(state.betAmount);
        if (response?.balance?.amount != null) {
          state.balance = response.balance.amount / API_MULTIPLIER;
        }
      }
    } catch (err: any) {
      console.error("Play network error:", err);
      showNoticeModal("Connection Warning", "Failed to place bet with server. Falling back to offline mode.");
      response = localEngine.play(state.betAmount);
    }

    updateBalanceUI();

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

    // Deal cards (3 player, 3 dealer face-down)
    for (let i = 0; i < 3; i++) {
      await new Promise((r) => setTimeout(r, 100));
      sound.playCardDeal();
      if (elPlayerCards) elPlayerCards.appendChild(createCardElement(playerCards[i], false));
      if (elDealerCards) elDealerCards.appendChild(createCardElement(dealerCards[i], false));
    }

    // Flip player cards face up
    await new Promise((r) => setTimeout(r, 120));
    if (elPlayerCards) {
      const pCards = elPlayerCards.querySelectorAll(".card-wrapper");
      pCards.forEach((el, idx) => {
        setTimeout(() => {
          sound.playCardFlip();
          el.classList.add("flipped");
        }, idx * 80);
      });
    }

    await new Promise((r) => setTimeout(r, 300));
    if (elPlayerHandBadge) {
      elPlayerHandBadge.textContent = playerHandName;
      elPlayerHandBadge.classList.add("visible");
    }

    // Place Play Bet visual chip
    sound.playChip();
    if (elSpotPlay) {
      elSpotPlay.classList.add("active");
      const chipText = state.betAmount >= 1 ? String(Math.floor(state.betAmount)) : state.betAmount.toFixed(1);
      elSpotPlay.innerHTML = `<div class="placed-chip chip-1">${chipText}</div>`;
    }
    if (elPlayAmount) {
      elPlayAmount.textContent = formatCurrencyAmount(state.betAmount, state.currency);
    }

    // Reveal Dealer Cards
    await new Promise((r) => setTimeout(r, 200));
    if (elDealerCards) {
      const dCards = elDealerCards.querySelectorAll(".card-wrapper");
      for (let i = 0; i < dCards.length; i++) {
        await new Promise((y) => setTimeout(y, 100));
        sound.playCardFlip();
        dCards[i].classList.add("flipped");
      }
    }

    if (elDealerHandBadge) {
      elDealerHandBadge.textContent = `${dealerHandName} (${dealerQualifies ? state.t.dealerQualifies : "No Qualify"})`;
      elDealerHandBadge.classList.add("visible");
    }

    await new Promise((r) => setTimeout(r, 250));

    // Determine Result Banner
    const totalWinAmount = state.betAmount * (payoutMultiplier / 100);

    if (payoutMultiplier > 100) {
      sound.playWin();
      if (elResultTitle) {
        elResultTitle.textContent =
          outcome === "dealer_not_qualify" ? state.t.dealerDoesNotQualify : state.t.playerWins;
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
        elResultPayout.textContent = `${state.t.won}: ${formatCurrencyAmount(totalWinAmount, state.currency)} (${(payoutMultiplier / 100).toFixed(1)}x)`;
      }
    } else if (payoutMultiplier === 100) {
      sound.playPush();
      if (elResultTitle) {
        elResultTitle.textContent = state.t.pushTie;
        elResultTitle.className = "result-title tie";
      }
      if (elResultDetail) elResultDetail.textContent = "Equal hands - wager returned";
      if (elResultPayout) elResultPayout.textContent = `Returned: ${formatCurrencyAmount(totalWinAmount, state.currency)}`;
    } else {
      sound.playPush();
      if (elResultTitle) {
        elResultTitle.textContent = state.t.dealerWins;
        elResultTitle.className = "result-title lose";
      }
      if (elResultDetail) {
        elResultDetail.textContent =
          anteBonus > 0 ? "Dealer wins, but Ante Bonus awarded!" : `Dealer's ${dealerHandName} wins`;
      }
      if (elResultPayout) {
        elResultPayout.textContent =
          totalWinAmount > 0
            ? `Bonus Won: ${formatCurrencyAmount(totalWinAmount, state.currency)}`
            : "Payout: 0.00";
      }
    }

    if (elResultBanner) elResultBanner.classList.add("visible");

    // =========================================================================
    // RGS REQUIREMENT: Zero-win bets do NOT send an end-round request to the RGS!
    // =========================================================================
    if (payoutMultiplier > 0) {
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
    }

    // Auto Play checks
    if (state.isAutoPlaying) {
      state.autoRoundsRemaining--;
      const balanceDiff = state.autoStartBalance - state.balance;

      if (state.autoRoundsRemaining <= 0) {
        stopAutoPlay();
      } else if (state.autoLossLimit && balanceDiff >= state.autoLossLimit) {
        stopAutoPlay();
        showNoticeModal("Auto Play Stopped", `Loss limit of ${formatCurrencyAmount(state.autoLossLimit, state.currency)} reached.`);
      } else if (state.autoWinLimit && totalWinAmount >= state.autoWinLimit) {
        stopAutoPlay();
        showNoticeModal("Auto Play Stopped", `Single win limit of ${formatCurrencyAmount(state.autoWinLimit, state.currency)} reached.`);
      } else {
        // Schedule next round
        setTimeout(() => {
          if (state.isAutoPlaying) {
            handleDeal();
          }
        }, 1200);
      }
    }
  } catch (criticalErr) {
    console.error("Critical error in deal loop:", criticalErr);
    if (state.isAutoPlaying) stopAutoPlay();
  } finally {
    updateBalanceUI();
    state.stage = "IDLE";
    updateDealButtonText();
  }
}

function updateDealButtonText() {
  if (!elDealBtn) return;
  if (state.isAutoPlaying) {
    elDealBtn.disabled = false;
    elDealBtn.classList.add("stop-auto-mode");
    elDealBtn.innerHTML = `<span>${state.t.stopAuto} (${state.autoRoundsRemaining})</span>`;
  } else {
    elDealBtn.disabled = false;
    elDealBtn.classList.remove("stop-auto-mode");
    elDealBtn.innerHTML = `<span>${state.t.deal}</span><span class="space-hint">Space</span>`;
  }
}

function stopAutoPlay() {
  state.isAutoPlaying = false;
  state.autoRoundsRemaining = 0;
  updateDealButtonText();
}

function showNoticeModal(title: string, message: string) {
  alert(`${title}\n\n${message}`);
}

/**
 * Replay Player: Re-enacts a past round smoothly
 */
async function playReplayRound(roundData: ParsedRoundData, betCost: number) {
  state.stage = "REPLAY";
  resetTable();

  // Populate replay header
  if (elReplayHeaderBar) elReplayHeaderBar.classList.remove("hidden");
  if (elReplayBetCost) elReplayBetCost.textContent = formatCurrencyAmount(betCost, state.currency);
  if (elReplayMultiplier) elReplayMultiplier.textContent = `${(roundData.payoutMultiplier / 100).toFixed(1)}×`;
  const winVal = betCost * (roundData.payoutMultiplier / 100);
  if (elReplayPayoutVal) elReplayPayoutVal.textContent = formatCurrencyAmount(winVal, state.currency);

  if (elDealBtn) {
    elDealBtn.disabled = true;
    elDealBtn.innerHTML = `<span>${state.t.replayMode}</span>`;
  }

  // Deal
  for (let i = 0; i < 3; i++) {
    await new Promise((r) => setTimeout(r, 120));
    sound.playCardDeal();
    if (elPlayerCards) elPlayerCards.appendChild(createCardElement(roundData.playerCards[i], false));
    if (elDealerCards) elDealerCards.appendChild(createCardElement(roundData.dealerCards[i], false));
  }

  // Flip player
  await new Promise((r) => setTimeout(r, 150));
  if (elPlayerCards) {
    elPlayerCards.querySelectorAll(".card-wrapper").forEach((el, idx) => {
      setTimeout(() => {
        sound.playCardFlip();
        el.classList.add("flipped");
      }, idx * 100);
    });
  }

  await new Promise((r) => setTimeout(r, 350));
  if (elPlayerHandBadge) {
    elPlayerHandBadge.textContent = roundData.playerHandName;
    elPlayerHandBadge.classList.add("visible");
  }

  // Visual play spot
  if (elSpotPlay) {
    elSpotPlay.classList.add("active");
    const chipText = betCost >= 1 ? String(Math.floor(betCost)) : betCost.toFixed(1);
    elSpotPlay.innerHTML = `<div class="placed-chip chip-1">${chipText}</div>`;
  }
  if (elPlayAmount) elPlayAmount.textContent = formatCurrencyAmount(betCost, state.currency);

  // Reveal dealer
  await new Promise((r) => setTimeout(r, 250));
  if (elDealerCards) {
    const dCards = elDealerCards.querySelectorAll(".card-wrapper");
    for (let i = 0; i < dCards.length; i++) {
      await new Promise((y) => setTimeout(y, 140));
      sound.playCardFlip();
      dCards[i].classList.add("flipped");
    }
  }

  if (elDealerHandBadge) {
    elDealerHandBadge.textContent = `${roundData.dealerHandName} (${roundData.dealerQualifies ? state.t.dealerQualifies : "No Qualify"})`;
    elDealerHandBadge.classList.add("visible");
  }

  await new Promise((r) => setTimeout(r, 300));

  if (roundData.payoutMultiplier > 100) {
    sound.playWin();
    if (elResultTitle) {
      elResultTitle.textContent =
        roundData.outcome === "dealer_not_qualify" ? state.t.dealerDoesNotQualify : state.t.playerWins;
      elResultTitle.className = "result-title win";
    }
    if (elResultDetail) elResultDetail.textContent = `Replay Event • Won ${(roundData.payoutMultiplier / 100).toFixed(1)}x`;
    if (elResultPayout) elResultPayout.textContent = `${state.t.won}: ${formatCurrencyAmount(winVal, state.currency)}`;
  } else if (roundData.payoutMultiplier === 100) {
    sound.playPush();
    if (elResultTitle) {
      elResultTitle.textContent = state.t.pushTie;
      elResultTitle.className = "result-title tie";
    }
    if (elResultDetail) elResultDetail.textContent = "Equal hands - wager returned";
    if (elResultPayout) elResultPayout.textContent = `Returned: ${formatCurrencyAmount(winVal, state.currency)}`;
  } else {
    sound.playPush();
    if (elResultTitle) {
      elResultTitle.textContent = state.t.dealerWins;
      elResultTitle.className = "result-title lose";
    }
    if (elResultDetail) elResultDetail.textContent = `Dealer's ${roundData.dealerHandName} wins`;
    if (elResultPayout) elResultPayout.textContent = "Payout: 0.00";
  }

  if (elResultBanner) elResultBanner.classList.add("visible");
}

/**
 * Hydrates betting parameters dynamically from authenticate response
 */
function applyBetLevels(config?: any) {
  if (!config) return;

  if (config.minBet != null) state.minBet = config.minBet / API_MULTIPLIER;
  if (config.maxBet != null) state.maxBet = config.maxBet / API_MULTIPLIER;
  if (config.stepBet != null) state.stepBet = config.stepBet / API_MULTIPLIER;
  if (config.defaultBetLevel != null) {
    state.defaultBet = config.defaultBetLevel / API_MULTIPLIER;
    state.betAmount = state.defaultBet;
  }

  if (Array.isArray(config.betLevels) && config.betLevels.length > 0) {
    state.betLevels = config.betLevels.map((lvl: number) => lvl / API_MULTIPLIER);
  }

  // Populate chip selector DOM dynamically
  if (elChipsRow && state.betLevels.length > 0) {
    elChipsRow.innerHTML = "";
    // Display up to 6 representative chips
    const levelsToDisplay = state.betLevels.slice(0, 6);
    levelsToDisplay.forEach((lvl, idx) => {
      const btn = document.createElement("button");
      btn.className = `chip-btn chip-${idx === 0 ? "10c" : idx === 1 ? "50c" : idx === 2 ? "1" : idx === 3 ? "5" : idx === 4 ? "25" : "100"}`;
      btn.dataset.val = String(lvl);
      btn.setAttribute("aria-label", `${lvl} chip`);
      btn.textContent = lvl >= 1 ? String(lvl) : lvl.toFixed(1);
      if (Math.abs(lvl - state.betAmount) < 0.001) {
        btn.classList.add("selected");
      }
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        dismissBanner();
        if (state.stage !== "IDLE") return;
        sound.playChip();
        checkAndSetBet(lvl);
      });
      elChipsRow?.appendChild(btn);
    });
  }

  updateBetUI();
}

function checkAndSetBet(targetAmount: number) {
  const clamped = Math.max(state.minBet, Math.min(state.maxBet, Math.round(targetAmount * 10) / 10));

  // High-cost bet mode confirmation check
  if (clamped >= state.highBetThreshold && clamped > state.betAmount) {
    state.pendingHighBetAmount = clamped;
    const summary = document.getElementById("highBetSummary");
    if (summary) summary.textContent = `Wager: ${formatCurrencyAmount(clamped, state.currency)}`;
    elHighBetModal?.classList.add("open");
    return;
  }

  state.betAmount = clamped;
  updateBetUI();
}

function setupEvents() {
  // Deal Button
  elDealBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (state.isAutoPlaying) {
      stopAutoPlay();
    } else {
      handleDeal();
    }
  });

  // Spacebar binding
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.key === " ") {
      // Don't trigger if user is in an input or modal is open
      const isInputActive =
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA";
      const isModalOpen =
        elPaytableModal?.classList.contains("open") ||
        elAutoPlayModal?.classList.contains("open") ||
        elHighBetModal?.classList.contains("open");

      if (isInputActive || isModalOpen) return;

      e.preventDefault();
      if (state.isAutoPlaying) {
        stopAutoPlay();
      } else {
        handleDeal();
      }
    }

    if (e.key === "Escape") {
      elPaytableModal?.classList.remove("open");
      elAutoPlayModal?.classList.remove("open");
      elHighBetModal?.classList.remove("open");
    }
  });

  // Result banner dismissal on any click/tap
  elResultBanner?.addEventListener("click", () => dismissBanner());
  document.addEventListener("click", () => dismissBanner());
  document.addEventListener("touchstart", () => dismissBanner(), { passive: true });

  // Bet modifiers: Half & Double
  document.getElementById("btnHalf")?.addEventListener("click", (e) => {
    e.stopPropagation();
    dismissBanner();
    if (state.stage !== "IDLE") return;
    sound.playChip();
    checkAndSetBet(state.betAmount / 2);
  });

  document.getElementById("btnDouble")?.addEventListener("click", (e) => {
    e.stopPropagation();
    dismissBanner();
    if (state.stage !== "IDLE") return;
    sound.playChip();
    checkAndSetBet(state.betAmount * 2);
  });

  // Sound toggle
  elSoundToggleBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    const enabled = sound.toggleMute();
    if (elSoundToggleBtn) elSoundToggleBtn.textContent = enabled ? "🔊" : "🔇";
  });
  // Initial sound icon sync
  if (elSoundToggleBtn) {
    elSoundToggleBtn.textContent = sound.isEnabled() ? "🔊" : "🔇";
  }

  // Modals & Navigation
  document.getElementById("rulesBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    elPaytableModal?.classList.add("open");
  });

  document.getElementById("closeModalBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    elPaytableModal?.classList.remove("open");
  });

  document.getElementById("closeModalFooterBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    elPaytableModal?.classList.remove("open");
  });

  // Rules tabs
  const tabBtns = document.querySelectorAll(".rules-nav-tabs .tab-btn");
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      tabBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const target = (btn as HTMLElement).dataset.tab;
      document.querySelectorAll(".tab-content").forEach((tc) => tc.classList.remove("active"));
      if (target) document.getElementById(target)?.classList.add("active");
    });
  });

  // Auto Play Modal
  elAutoPlayBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (state.isAutoPlaying) {
      stopAutoPlay();
    } else {
      elAutoPlayModal?.classList.add("open");
    }
  });

  document.getElementById("closeAutoModalBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    elAutoPlayModal?.classList.remove("open");
  });

  document.getElementById("cancelAutoBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    elAutoPlayModal?.classList.remove("open");
  });

  // Auto-play round selector buttons
  const roundChoices = document.querySelectorAll(".round-choice");
  roundChoices.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      roundChoices.forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      state.selectedAutoRounds = parseInt((btn as HTMLElement).dataset.rounds || "10", 10);
    });
  });

  // Auto-play start confirmation
  document.getElementById("startAutoBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    elAutoPlayModal?.classList.remove("open");

    const lossVal = parseFloat((document.getElementById("autoLossLimit") as HTMLInputElement)?.value || "0");
    const winVal = parseFloat((document.getElementById("autoWinLimit") as HTMLInputElement)?.value || "0");

    state.isAutoPlaying = true;
    state.autoRoundsRemaining = state.selectedAutoRounds;
    state.autoStartBalance = state.balance;
    state.autoLossLimit = lossVal > 0 ? lossVal : null;
    state.autoWinLimit = winVal > 0 ? winVal : null;

    updateDealButtonText();
    handleDeal();
  });

  // High bet modal
  document.getElementById("closeHighBetModalBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    elHighBetModal?.classList.remove("open");
  });

  document.getElementById("cancelHighBetBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    elHighBetModal?.classList.remove("open");
  });

  document.getElementById("confirmHighBetBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (state.pendingHighBetAmount != null) {
      state.betAmount = state.pendingHighBetAmount;
      updateBetUI();
    }
    elHighBetModal?.classList.remove("open");
  });

  // Replay again button
  elBtnReplayAgain?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (state.currentRound) {
      playReplayRound(state.currentRound, state.betAmount);
    }
  });

  // Outside click closes modals
  [elPaytableModal, elAutoPlayModal, elHighBetModal].forEach((modal) => {
    modal?.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.remove("open");
      }
    });
  });
}

// Initializer
async function init() {
  initElements();
  setupEvents();
  applyTranslations();

  // Set initial currency from client
  state.currency = rgs.currency;

  if (rgs.isReplay) {
    // Replay Mode
    if (elStatusBadge) {
      elStatusBadge.textContent = state.t.replayMode;
      elStatusBadge.style.color = "#c084fc";
    }

    const replayEvent = await rgs.fetchReplayEvent();
    const replayMultiplier = replayEvent?.payoutMultiplier ?? 200;
    const fallbackRound = generateFallbackRound(replayMultiplier);
    const parsed = parseRoundData(replayEvent || fallbackRound);
    state.currentRound = parsed;

    playReplayRound(parsed, state.betAmount);
    return;
  }

  if (rgs.isConnected) {
    try {
      const auth = await rgs.authenticate();
      state.balance = auth.balance.amount / API_MULTIPLIER;
      state.currency = auth.balance.currency || "USD";

      // Dynamically apply bet level config
      if (auth.config) {
        applyBetLevels(auth.config);
      }

      // RGS Requirement: Active rounds restore bet amount from authenticate response
      if (auth.round) {
        if (auth.round.amount != null) {
          state.betAmount = auth.round.amount / API_MULTIPLIER;
          updateBetUI();
        }
      }

      if (elStatusBadge) {
        elStatusBadge.textContent = "Stake RGS Connected";
        elStatusBadge.classList.add("connected");
      }
    } catch (err) {
      // RGS Requirement: Game authentication fails correctly with invalid rgs_url
      console.warn("RGS authentication failed, falling back safely to demo mode:", err);
      if (elStatusBadge) {
        elStatusBadge.textContent = "Offline Demo Mode";
      }
    }
  } else {
    if (elStatusBadge) elStatusBadge.textContent = "Offline Demo Mode";
  }

  updateBalanceUI();
  updateBetUI();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
