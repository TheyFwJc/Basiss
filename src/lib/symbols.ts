import { FUTURES_SYMBOLS } from "./futures-contracts";
import type { AssetClass } from "./import";

/**
 * Static, bundled ticker lists used only to populate the Symbol suggestion
 * dropdown on the trade form — one list per asset class, so picking Futures
 * shows futures roots instead of stock tickers, and so on. Not a live
 * market-data feed (this app has none — see ARCHITECTURE.md's Phase 7 notes)
 * and not authoritative; convenience lists only — the field always accepts
 * any typed symbol regardless of whether it's on here.
 */
export const POPULAR_EQUITY_SYMBOLS: string[] = [
  // Mega-cap tech
  "AAPL", "MSFT", "GOOGL", "GOOG", "AMZN", "META", "NVDA", "TSLA", "AVGO", "ORCL",
  "CRM", "ADBE", "NFLX", "AMD", "INTC", "CSCO", "QCOM", "TXN", "IBM", "NOW",
  "INTU", "UBER", "PANW", "SNOW", "PLTR", "SHOP", "ABNB", "PYPL", "SQ", "COIN",

  // Financials
  "JPM", "BAC", "WFC", "C", "GS", "MS", "SCHW", "AXP", "BLK", "SPGI",
  "V", "MA", "USB", "PNC", "TFC", "COF", "BK", "MET", "AIG", "PRU",
  "TRV", "ALL", "PGR", "CB", "AON", "MMC", "ICE", "CME", "MCO",

  // Healthcare
  "UNH", "JNJ", "LLY", "ABBV", "MRK", "PFE", "TMO", "ABT", "DHR", "BMY",
  "AMGN", "GILD", "CVS", "CI", "ELV", "HUM", "MDT", "ISRG", "SYK", "BSX",
  "REGN", "VRTX", "ZTS", "BDX", "HCA", "MRNA", "IDXX", "IQV",

  // Consumer
  "WMT", "PG", "KO", "PEP", "COST", "HD", "MCD", "NKE", "SBUX", "TGT",
  "LOW", "TJX", "DIS", "BKNG", "CMG", "MAR", "YUM", "DPZ", "ROST", "LULU",
  "EL", "CL", "KMB", "GIS", "KHC", "MDLZ", "MNST", "STZ", "HSY", "CLX",

  // Energy
  "XOM", "CVX", "COP", "SLB", "EOG", "MPC", "PSX", "VLO", "OXY", "WMB",
  "KMI", "OKE", "HES", "DVN", "FANG",

  // Industrials
  "BA", "CAT", "HON", "UNP", "UPS", "RTX", "LMT", "GE", "DE", "MMM",
  "GD", "NOC", "EMR", "ETN", "ITW", "PH", "CSX", "NSC", "FDX", "WM",
  "TDG", "CARR", "OTIS", "PCAR", "CMI", "ROK",

  // Utilities & real estate
  "NEE", "DUK", "SO", "D", "AEP", "SRE", "EXC", "XEL", "ED", "WEC",
  "AMT", "PLD", "CCI", "EQIX", "PSA", "SPG", "O", "WELL", "DLR", "AVB",

  // Materials & telecom
  "LIN", "APD", "SHW", "ECL", "NEM", "FCX", "DOW", "DD", "T", "VZ",
  "TMUS", "CMCSA", "CHTR",

  // Growth / semis / other notables
  "ASML", "TSM", "MU", "LRCX", "KLAC", "AMAT", "ADI", "MRVL", "ON", "NXPI",
  "ARM", "SMCI", "DELL", "HPQ", "HPE", "NET", "DDOG", "ZS", "CRWD", "FTNT",
  "TEAM", "WDAY", "ANET", "MDB", "OKTA",

  // Popular ETFs — broad market
  "SPY", "QQQ", "DIA", "IWM", "VOO", "VTI", "VEA", "VWO", "IVV", "VUG",
  "VTV", "IJH", "IJR", "MDY",

  // Sector / thematic ETFs
  "XLK", "XLF", "XLE", "XLV", "XLY", "XLP", "XLI", "XLB", "XLU", "XLRE",
  "XLC", "SMH", "SOXX", "ARKK", "XBI", "KBE", "KRE",

  // Bond / commodity / volatility ETFs
  "TLT", "IEF", "SHY", "AGG", "BND", "LQD", "HYG", "GLD", "SLV", "USO",
  "UNG", "VIXY", "UVXY",

  // International
  "EFA", "EEM", "FXI", "EWJ", "EWZ", "INDA",
];

export const POPULAR_FOREX_SYMBOLS: string[] = [
  // Majors
  "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", "NZDUSD",

  // Crosses
  "EURGBP", "EURJPY", "GBPJPY", "EURCHF", "AUDJPY", "CHFJPY", "NZDJPY", "EURAUD", "GBPAUD",

  // Other
  "USDCNH", "USDMXN", "USDZAR", "USDSEK", "USDNOK", "USDTRY",
];

export const POPULAR_CRYPTO_SYMBOLS: string[] = [
  // Large-cap
  "BTC", "ETH", "SOL", "BNB", "XRP",

  // Mid-cap
  "ADA", "DOGE", "AVAX", "LINK", "MATIC", "LTC", "DOT", "ATOM", "UNI", "TRX",

  // Other notables
  "SHIB", "NEAR", "APT", "ARB", "OP",
];

export { FUTURES_SYMBOLS };

/** Which suggestion list to show in the Symbol field for a given asset class. */
export function symbolSuggestionsFor(assetClass: AssetClass | string): string[] {
  switch (assetClass) {
    case "FUTURES":
      return FUTURES_SYMBOLS;
    case "FOREX":
      return POPULAR_FOREX_SYMBOLS;
    case "CRYPTO":
      return POPULAR_CRYPTO_SYMBOLS;
    case "EQUITY":
    case "OPTION":
    default:
      return POPULAR_EQUITY_SYMBOLS;
  }
}
