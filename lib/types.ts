export type TF = "D" | "W";
export type Kbar = { date: string; open: number; high: number; low: number; close: number; volume: number };
export type MacdParams = { fast: number; slow: number; signal: number };
export type ScreenerParams = MacdParams & {
  months: number;                 // 抓取月數
  volumeMultiplier: number;       // 量能過濾倍數，當日>5MA*倍數
  tf: TF;                         // D=日, W=週
  streak?: "UP3" | "DOWN3" | "ALL"; // 連三增/連三減/全部
};
export type ScreenerRow = {
  code: string;
  dif: number;
  dea: number;
  osc: number;
  signal: "GOLDEN" | "DEAD" | "NONE";
  volCheck: "OK" | "LOW" | "NA";
};
export type ScreenerResponse = { dataDate: string; tf: TF; rows: ScreenerRow[] };
