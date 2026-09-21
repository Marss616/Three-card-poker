/**
 * Multi-Language (i18n) and Stake.US Social Mode Dictionary
 * Themed for POKER KING: ALL HAIL THE HAND
 */

export interface Translations {
  gameTitle: string;
  ante: string;
  play: string;
  deal: string;
  dealing: string;
  dealAgain: string;
  balance: string;
  bet: string;
  won: string;
  dealerDoesNotQualify: string;
  dealerQualifies: string;
  playerWins: string;
  dealerWins: string;
  pushTie: string;
  straight: string;
  threeOfAKind: string;
  straightFlush: string;
  miniRoyal: string;
  flush: string;
  pair: string;
  highCard: string;
  autoPlay: string;
  startAuto: string;
  stopAuto: string;
  rounds: string;
  lossLimit: string;
  rulesAndPaytable: string;
  howToPlay: string;
  rtpLabel: string;
  maxWinLabel: string;
  generalDisclaimer: string;
  close: string;
  confirm: string;
  cancel: string;
  highCostWarning: string;
  replayMode: string;
  replayAgain: string;
  cost: string;
  multiplier: string;
  payout: string;
}

const en: Translations = {
  gameTitle: "Poker King",
  ante: "ANTE",
  play: "PLAY",
  deal: "DEAL",
  dealing: "DEALING...",
  dealAgain: "DEAL AGAIN",
  balance: "Balance",
  bet: "Bet",
  won: "Won",
  dealerDoesNotQualify: "👑 THE KING DOES NOT QUALIFY!",
  dealerQualifies: "The King Qualifies",
  playerWins: "👑 ALL HAIL THE HAND!",
  dealerWins: "⚔️ THE KING PREVAILS",
  pushTie: "👑 ROYAL PUSH (TIE)",
  straight: "Straight",
  threeOfAKind: "Three of a Kind",
  straightFlush: "Straight Flush",
  miniRoyal: "Mini Royal Flush",
  flush: "Flush",
  pair: "Pair",
  highCard: "High Card",
  autoPlay: "Auto Play",
  startAuto: "START AUTO PLAY",
  stopAuto: "STOP AUTO",
  rounds: "Rounds",
  lossLimit: "Stop on Loss Limit",
  rulesAndPaytable: "The King's Decree & Paytable",
  howToPlay: "User Interaction Guide",
  rtpLabel: "Theoretical RTP: 95.70%",
  maxWinLabel: "Maximum Win: 22.0×",
  generalDisclaimer: "Malfunction voids all pays and plays. All outcomes are mathematically determined and provably verifiable.",
  close: "Close",
  confirm: "Confirm",
  cancel: "Cancel",
  highCostWarning: "You are placing an imperial high wager. Confirm to continue.",
  replayMode: "ROYAL REPLAY",
  replayAgain: "Replay Again",
  cost: "Royal Wager",
  multiplier: "Multiplier",
  payout: "Treasury Payout",
};

// Social Mode (Stake.US) English translations: strictly removing restricted gambling terms
const socialEn: Translations = {
  ...en,
  balance: "Available Coins",
  bet: "Play Amount",
  autoPlay: "Auto Play",
  startAuto: "START AUTO PLAY",
  highCostWarning: "You have selected a high value play. Confirm to continue.",
  cost: "Play Amount",
  generalDisclaimer: "Void where prohibited. No purchase necessary for social gameplay. Return to Player (RTP) is calculated based on optimal strategy over millions of rounds.",
};

const es: Translations = {
  ...en,
  gameTitle: "Poker King",
  ante: "ANTE",
  play: "JUGAR",
  deal: "REPARTIR",
  dealing: "REPARTIENDO...",
  dealAgain: "REPARTIR DE NUEVO",
  balance: "Saldo",
  bet: "Apuesta",
  won: "Ganado",
  dealerDoesNotQualify: "¡EL REY NO CALIFICA!",
  playerWins: "👑 ¡GLORIA A LA MANO!",
  dealerWins: "EL REY PREVALECE",
  pushTie: "EMPATE REAL",
  autoPlay: "Juego Automático",
  close: "Cerrar",
  confirm: "Confirmar",
  cancel: "Cancelar",
  replayAgain: "Repetir jugada",
};

const de: Translations = {
  ...en,
  gameTitle: "Poker King",
  ante: "ANTE",
  play: "SPIEL",
  deal: "GEBEN",
  dealing: "GIBT...",
  dealAgain: "ERNEUT GEBEN",
  balance: "Guthaben",
  bet: "Einsatz",
  won: "Gewonnen",
  dealerDoesNotQualify: "DER KÖNIG QUALIFIZIERT SICH NICHT!",
  playerWins: "👑 HEIL DER HAND!",
  dealerWins: "DER KÖNIG SIEGT",
  pushTie: "KÖNIGLICHES UNENTSCHIEDEN",
  autoPlay: "Autoplay",
  close: "Schließen",
  confirm: "Bestätigen",
  cancel: "Abbrechen",
  replayAgain: "Wiederholen",
};

const fr: Translations = {
  ...en,
  gameTitle: "Poker King",
  ante: "ANTE",
  play: "JOUER",
  deal: "DISTRIBUER",
  dealing: "DISTRIBUTION...",
  dealAgain: "REDISTRIBUER",
  balance: "Solde",
  bet: "Mise",
  won: "Gagné",
  dealerDoesNotQualify: "LE ROI NE SE QUALIFIE PAS!",
  playerWins: "👑 GLOIRE À LA MAIN!",
  dealerWins: "LE ROI L'EMPORTE",
  pushTie: "ÉGALITÉ ROYALE",
  autoPlay: "Jeu Auto",
  close: "Fermer",
  confirm: "Confirmer",
  cancel: "Annuler",
  replayAgain: "Rejouer",
};

const ja: Translations = {
  ...en,
  gameTitle: "Poker King",
  ante: "アンティ",
  play: "プレイ",
  deal: "ディール",
  dealing: "配布中...",
  dealAgain: "もう一度ディール",
  balance: "残高",
  bet: "ベット",
  won: "獲得",
  dealerDoesNotQualify: "キング資格なし！",
  playerWins: "👑 ハンドに栄光あれ！",
  dealerWins: "キングの勝利",
  pushTie: "引き分け (プッシュ)",
  autoPlay: "オートプレイ",
  close: "閉じる",
  confirm: "確認",
  cancel: "キャンセル",
  replayAgain: "リプレイ",
};

const pt: Translations = {
  ...en,
  gameTitle: "Poker King",
  ante: "ANTE",
  play: "JOGAR",
  deal: "DISTRIBUIR",
  dealing: "DISTRIBUINDO...",
  dealAgain: "DISTRIBUIR NOVAMENTE",
  balance: "Saldo",
  bet: "Aposta",
  won: "Ganhou",
  dealerDoesNotQualify: "O REI NÃO SE QUALIFICA!",
  playerWins: "👑 GLÓRIA À MÃO!",
  dealerWins: "O REI PREVALECE",
  pushTie: "EMPATE REAL",
  autoPlay: "Jogo Automático",
  close: "Fechar",
  confirm: "Confirmar",
  cancel: "Cancelar",
  replayAgain: "Repetir",
};

const ru: Translations = {
  ...en,
  gameTitle: "Poker King",
  ante: "АНТЕ",
  play: "ИГРА",
  deal: "СДАТЬ",
  dealing: "РАЗДАЧА...",
  dealAgain: "СДАТЬ СНОВА",
  balance: "Казна",
  bet: "Ставка",
  won: "Выигрыш",
  dealerDoesNotQualify: "КОРОЛЬ НЕ КВАЛИФИЦИРОВАН!",
  playerWins: "👑 ДА ЗДРАВСТВУЕТ РУКА!",
  dealerWins: "КОРОЛЬ ПОБЕЖДАЕТ",
  pushTie: "КОРОЛЕВСКАЯ НИЧЬЯ",
  autoPlay: "Автоигра",
  close: "Закрыть",
  confirm: "Подтвердить",
  cancel: "Отмена",
  replayAgain: "Повторить",
};

const zh: Translations = {
  ...en,
  gameTitle: "Poker King",
  ante: "底注",
  play: "加注",
  deal: "发牌",
  dealing: "发牌中...",
  dealAgain: "再次发牌",
  balance: "国库余额",
  bet: "投注",
  won: "获胜",
  dealerDoesNotQualify: "国王不符合资格！",
  playerWins: "👑 王者之手！获胜！",
  dealerWins: "国王获胜",
  pushTie: "平局 (退还)",
  autoPlay: "自动游戏",
  close: "关闭",
  confirm: "确认",
  cancel: "取消",
  replayAgain: "重播",
};

const DICTIONARY: Record<string, Translations> = {
  en,
  es,
  de,
  fr,
  ja,
  pt,
  ru,
  zh,
};

export function getTranslations(lang: string, isSocialMode: boolean = false): Translations {
  if (isSocialMode) {
    return socialEn;
  }
  const clean = (lang || "en").toLowerCase().slice(0, 2);
  return DICTIONARY[clean] || en;
}
