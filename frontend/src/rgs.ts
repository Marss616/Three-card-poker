/**
 * Stake Engine RGS (Remote Game Server) API Client & Currency Formatter
 * Compliant with Stake Engine Specifications & Verification Guidelines
 */

export const API_MULTIPLIER = 1000000; // 6 decimal places: $1 = 1,000,000

export type SupportedCurrency =
  | "USD" | "CAD" | "JPY" | "EUR" | "RUB" | "CNY" | "PHP" | "INR" | "IDR"
  | "KRW" | "BRL" | "MXN" | "DKK" | "PLN" | "VND" | "TRY" | "CLP" | "ARS"
  | "PEN" | "XGC" | "XSC" | "GC" | "SC";

export interface CurrencyMetadata {
  symbol: string;
  decimals: number;
  symbolAfter?: boolean;
  isSocial?: boolean;
}

export const CURRENCY_MAP: Record<string, CurrencyMetadata> = {
  USD: { symbol: "$", decimals: 2 },
  CAD: { symbol: "CA$", decimals: 2 },
  JPY: { symbol: "¥", decimals: 0 },
  EUR: { symbol: "€", decimals: 2 },
  RUB: { symbol: "₽", decimals: 2 },
  CNY: { symbol: "CN¥", decimals: 2 },
  PHP: { symbol: "₱", decimals: 2 },
  INR: { symbol: "₹", decimals: 2 },
  IDR: { symbol: "Rp", decimals: 0 },
  KRW: { symbol: "₩", decimals: 0 },
  BRL: { symbol: "R$", decimals: 2 },
  MXN: { symbol: "MX$", decimals: 2 },
  DKK: { symbol: "KR", decimals: 2, symbolAfter: true },
  PLN: { symbol: "zł", decimals: 2, symbolAfter: true },
  VND: { symbol: "₫", decimals: 0, symbolAfter: true },
  TRY: { symbol: "₺", decimals: 2 },
  CLP: { symbol: "CLP", decimals: 0, symbolAfter: true },
  ARS: { symbol: "ARS", decimals: 2, symbolAfter: true },
  PEN: { symbol: "S/", decimals: 2, symbolAfter: true },
  XGC: { symbol: "GC", decimals: 2, symbolAfter: true, isSocial: true },
  XSC: { symbol: "SC", decimals: 2, symbolAfter: true, isSocial: true },
  GC: { symbol: "GC", decimals: 2, symbolAfter: true, isSocial: true },
  SC: { symbol: "SC", decimals: 2, symbolAfter: true, isSocial: true },
};

/**
 * Robust Stake Engine Currency Formatter
 * - Supports all 21 currencies
 * - Correct prefix vs suffix placement
 * - Accurately displays sub-cent payouts (up to 6 decimals) without truncating to 0
 * - Strictly strips '$' prefix for Social Casino (GC / SC)
 */
export function formatCurrencyAmount(
  amount: number,
  currency: string = "USD",
  forceSubCentPrecision: boolean = false
): string {
  const normCurrency = (currency || "USD").toUpperCase();
  const meta: CurrencyMetadata = CURRENCY_MAP[normCurrency] || {
    symbol: normCurrency,
    decimals: 2,
    symbolAfter: true,
  };

  // Determine decimal precision: check if amount has fractional sub-cents
  let decimals = meta.decimals;
  const absAmount = Math.abs(amount);
  const frac = absAmount - Math.floor(absAmount);
  if ((frac > 0 && (forceSubCentPrecision || (meta.decimals === 2 && frac < 0.01))) || (meta.decimals === 0 && frac > 0)) {
    // Show sub-cent precision (up to 4-6 decimals)
    const s = amount.toFixed(6).replace(/0+$/, "");
    const parts = s.split(".");
    if (parts[1] && parts[1].length > decimals) {
      decimals = Math.min(6, Math.max(decimals, parts[1].length));
    }
  }

  const formattedNum = amount.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (meta.symbolAfter || meta.isSocial) {
    return `${formattedNum} ${meta.symbol}`;
  } else {
    return `${meta.symbol}${formattedNum}`;
  }
}

export interface RGSBalance {
  amount: number;
  currency: string;
}

export interface RGSEvent {
  index: number;
  type: string;
  [key: string]: any;
}

export interface RGSRound {
  id: number | string;
  payoutMultiplier: number;
  events?: RGSEvent[];
  state?: any;
  book?: any;
  amount?: number;
  [key: string]: any;
}

export interface RGSJurisdiction {
  socialCasino?: boolean;
  disabledFullscreen?: boolean;
  disabledTurbo?: boolean;
  [key: string]: any;
}

export interface RGSConfig {
  minBet?: number;
  maxBet?: number;
  stepBet?: number;
  defaultBetLevel?: number;
  betLevels?: number[];
  jurisdiction?: RGSJurisdiction;
  [key: string]: any;
}

export interface RGSAuthenticateResponse {
  balance: RGSBalance;
  config?: RGSConfig;
  round?: RGSRound;
}

export interface RGSPlayResponse {
  balance: RGSBalance;
  round: RGSRound;
}

export class RGSClient {
  public sessionID: string | null = null;
  public rgsUrl: string | null = null;
  public lang: string = "en";
  public device: string = "desktop";
  public currency: string = "USD";
  public mode: string = "base";
  public isConnected: boolean = false;
  public isReplay: boolean = false;
  public replayUrl: string | null = null;
  public replayData: any = null;
  public isSocialMode: boolean = false;
  public config: RGSConfig | null = null;

  constructor() {
    this.parseQueryParams();
  }

  private parseQueryParams() {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);

    this.sessionID = params.get("sessionID") || params.get("sessionId");
    this.rgsUrl = params.get("rgs_url") || params.get("rgsUrl");

    // Replay mode detection
    const replayParam = params.get("replay") || params.get("isReplay");
    const replayId = params.get("replayID") || params.get("replayId");
    this.replayUrl = params.get("replay_url") || params.get("replayUrl");
    this.isReplay = replayParam === "true" || !!replayId || !!this.replayUrl || params.has("replayData");

    const rawReplayData = params.get("replayData");
    if (rawReplayData) {
      try {
        this.replayData = JSON.parse(decodeURIComponent(rawReplayData));
      } catch (_) {}
    }

    // Optional parameters (supported in normal & replay)
    const rawLang = params.get("lang") || params.get("language") || "en";
    this.device = (params.get("device") || "desktop").toLowerCase();
    this.currency = (params.get("currency") || "USD").toUpperCase();
    this.mode = params.get("mode") || "base";

    // Detect social casino from currency or url
    if (
      this.currency === "XGC" ||
      this.currency === "GC" ||
      this.currency === "XSC" ||
      this.currency === "SC" ||
      params.get("social") === "true"
    ) {
      this.isSocialMode = true;
    }

    // In Social Mode, English is the ONLY supported language
    if (this.isSocialMode) {
      this.lang = "en";
    } else {
      this.lang = this.validateLanguage(rawLang);
    }

    this.isConnected = !!(this.sessionID && this.rgsUrl) && !this.isReplay;
  }

  /**
   * Validates ISO 639-1 language code.
   * Invalid language parameters gracefully fallback to 'en' without breaking display.
   */
  public validateLanguage(code: string): string {
    const supported = ["ar", "de", "en", "es", "fi", "fr", "hi", "id", "ja", "ko", "pl", "pt", "ru", "tr", "vi", "zh"];
    const normalized = (code || "").toLowerCase().trim().slice(0, 2);
    return supported.includes(normalized) ? normalized : "en";
  }

  private getUrl(endpoint: string): string {
    if (!this.rgsUrl) return endpoint;
    const cleanUrl = this.rgsUrl.replace(/\/+$/, "");
    const protocol = cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://") ? "" : "https://";
    return `${protocol}${cleanUrl}${endpoint}`;
  }

  private async post<T>(endpoint: string, body: Record<string, any>): Promise<T> {
    const url = this.getUrl(endpoint);
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (networkErr: any) {
      throw new Error(`RGS_NETWORK_ERROR: ${networkErr.message || "Failed to reach server"}`);
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`RGS_HTTP_${response.status}: ${errText}`);
    }

    return response.json();
  }

  public async authenticate(): Promise<RGSAuthenticateResponse> {
    if (!this.isConnected) {
      throw new Error("RGS_NOT_CONFIGURED: Missing sessionID or rgs_url");
    }
    const res = await this.post<RGSAuthenticateResponse>("/wallet/authenticate", {
      sessionID: this.sessionID,
      language: this.lang,
    });

    if (res.config) {
      this.config = res.config;
      if (res.config.jurisdiction?.socialCasino) {
        this.isSocialMode = true;
        this.lang = "en";
      }
    }
    if (res.balance?.currency) {
      this.currency = res.balance.currency.toUpperCase();
      if (this.currency === "XGC" || this.currency === "GC" || this.currency === "XSC" || this.currency === "SC") {
        this.isSocialMode = true;
        this.lang = "en";
      }
    }

    return res;
  }

  public async play(amountFloat: number): Promise<RGSPlayResponse> {
    if (!this.isConnected) {
      throw new Error("RGS_NOT_CONNECTED");
    }
    return this.post<RGSPlayResponse>("/wallet/play", {
      sessionID: this.sessionID,
      mode: this.mode,
      currency: this.currency,
      amount: Math.round(amountFloat * API_MULTIPLIER),
    });
  }

  /**
   * Completes a winning round.
   * NOTE: Per Stake Engine guidelines, zero-win bets MUST NOT send end-round requests!
   */
  public async endRound(): Promise<{ balance: RGSBalance }> {
    if (!this.isConnected) {
      throw new Error("RGS_NOT_CONNECTED");
    }
    return this.post<{ balance: RGSBalance }>("/wallet/end-round", {
      sessionID: this.sessionID,
    });
  }

  /**
   * Fetches replay event data if replayUrl or replayID is provided
   */
  public async fetchReplayEvent(): Promise<any> {
    if (this.replayData) return this.replayData;
    if (this.replayUrl) {
      try {
        const res = await fetch(this.replayUrl);
        if (res.ok) {
          return await res.json();
        }
      } catch (e) {
        console.warn("Could not fetch from replayUrl:", e);
      }
    }
    return null;
  }
}

export const rgs = new RGSClient();
