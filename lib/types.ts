// lib/types.ts
export type TF = "D" | "W";

export type Kbar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type MacdParams = { fast: number; slow: number; signal: number };

export type Filter =
  | "ALL"
  | "MACD_NEG_TO_POS"   // 柱狀圖由負轉正
  | "MACD_POS_TO_NEG"   // 柱狀圖由正轉負
  | "MACD_UP_STREAK"    // 柱狀圖連續增加（預設3根）
  | "MACD_DOWN_STREAK"  // 柱狀圖連續減少（預設3根）
  | "DIF_TURN_DOWN"     // DIF 由升轉降（斜率 +→-）
  | "DIF_TURN_UP";      // DIF 由降轉升（斜率 -→+）

export type ScreenerParams = MacdParams & {
  months: number;
  volumeMultiplier: number;
  tf: TF;              // D=日 / W=週
  filter: Filter;      // 新增：六種過濾條件
  streakLen?: number;  // 連續判定長度（預設3）
};

export type ScreenerRow = {
  code: string;
  dif: number;
  dea: number;
  osc: number;
  signal: "GOLDEN" | "DEAD" | "NONE";
  volCheck: "OK" | "LOW" | "NA";
};

export type ScreenerResponse = {
  dataDate: string;
  tf: TF;
  rows: ScreenerRow[];
};
