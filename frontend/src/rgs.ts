/**
 * Stake Engine RGS (Remote Game Server) API Client
 * Compatible with Stake Engine specs and simple_example docs.
 */

export const API_MULTIPLIER = 1000000; // 6 decimal places: $1 = 1,000,000

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
  id: number;
  payoutMultiplier: number;
  events: RGSEvent[];
  [key: string]: any;
}

export interface RGSPlayResponse {
  balance: RGSBalance;
  round: RGSRound;
}

export interface RGSAuthenticateResponse {
  balance: RGSBalance;
  config?: {
    minBet?: number;
    maxBet?: number;
    stepBet?: number;
    defaultBetLevel?: number;
    betLevels?: number[];
  };
  round?: RGSRound;
}

export class RGSClient {
  public sessionID: string | null = null;
  public rgsUrl: string | null = null;
  public lang: string = "en";
  public device: string = "desktop";
  public currency: string = "USD";
  public mode: string = "base";
  public isConnected: boolean = false;

  constructor() {
    this.parseQueryParams();
  }

  private parseQueryParams() {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    this.sessionID = params.get("sessionID") || params.get("sessionId");
    this.rgsUrl = params.get("rgs_url") || params.get("rgsUrl");
    this.lang = params.get("lang") || params.get("language") || "en";
    this.device = params.get("device") || "desktop";
    this.currency = params.get("currency") || "USD";
    this.mode = params.get("mode") || "base";

    this.isConnected = !!(this.sessionID && this.rgsUrl);
  }

  private getUrl(endpoint: string): string {
    if (!this.rgsUrl) return endpoint;
    const protocol = this.rgsUrl.startsWith("http") ? "" : "https://";
    return `${protocol}${this.rgsUrl}${endpoint}`;
  }

  private async post<T>(endpoint: string, body: Record<string, any>): Promise<T> {
    const url = this.getUrl(endpoint);
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`RGS Error HTTP ${response.status}: ${await response.text()}`);
    }

    return response.json();
  }

  public async authenticate(): Promise<RGSAuthenticateResponse> {
    if (!this.isConnected) {
      throw new Error("Cannot authenticate: missing sessionID or rgs_url");
    }
    return this.post<RGSAuthenticateResponse>("/wallet/authenticate", {
      sessionID: this.sessionID,
      language: this.lang,
    });
  }

  public async play(amountFloat: number): Promise<RGSPlayResponse> {
    if (!this.isConnected) {
      throw new Error("Cannot play: not connected to RGS");
    }
    return this.post<RGSPlayResponse>("/wallet/play", {
      sessionID: this.sessionID,
      mode: this.mode,
      currency: this.currency,
      amount: Math.round(amountFloat * API_MULTIPLIER),
    });
  }

  public async endRound(): Promise<{ balance: RGSBalance }> {
    if (!this.isConnected) {
      throw new Error("Cannot end round: not connected to RGS");
    }
    return this.post<{ balance: RGSBalance }>("/wallet/end-round", {
      sessionID: this.sessionID,
    });
  }
}

export const rgs = new RGSClient();
