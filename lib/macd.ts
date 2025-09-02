// lib/macd.ts
export function ema(values: number[], period: number): number[] {
  if (period <= 0) throw new Error("period must be > 0");
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev: number | undefined;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (prev === undefined) prev = v; // 簡化種子
    else prev = v * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

export function macd(closes: number[], fast = 12, slow = 26, signal = 9) {
  if (closes.length === 0) return { dif: [], dea: [], osc: [] };
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  const dif = closes.map((_, i) => emaFast[i] - emaSlow[i]);
  const dea = ema(dif, signal);
  const osc = dif.map((d, i) => d - dea[i]); // 柱狀圖
  return { dif, dea, osc };
}

export function lastSignal(dif: number[], dea: number[]): "GOLDEN" | "DEAD" | "NONE" {
  if (dif.length < 2 || dea.length < 2) return "NONE";
  const a = dif.at(-2)! - dea.at(-2)!;
  const b = dif.at(-1)! - dea.at(-1)!;
  if (a <= 0 && b > 0) return "GOLDEN";
  if (a >= 0 && b < 0) return "DEAD";
  return "NONE";
}

// ========== 下面是「六種條件」需要的小工具 ==========

// 柱狀圖（OSC）過零：負→正 或 正→負
export function crossedZero(prev: number, curr: number, dir: "UP" | "DOWN") {
  return dir === "UP" ? (prev <= 0 && curr > 0) : (prev >= 0 && curr < 0);
}

// 單調連續上升/下降（預設3根）
export function isMonotonicStreak(arr: number[], len = 3, mode: "UP" | "DOWN") {
  if (arr.length < len + 1) return false;
  for (let i = 0; i < len; i++) {
    const a = arr[arr.length - 1 - i];
    const b = arr[arr.length - 2 - i];
    if (mode === "UP"   && !(a > b)) return false;
    if (mode === "DOWN" && !(a < b)) return false;
  }
  return true;
}

// DIF 斜率轉折：(-→+) or (+→-)
export function slopeTurn(dif: number[], to: "UP" | "DOWN") {
  if (dif.length < 3) return false;
  const sPrev = dif.at(-2)! - dif.at(-3)!; // slope(n-1)
  const sCurr = dif.at(-1)! - dif.at(-2)!; // slope(n)
  return to === "UP" ? (sPrev < 0 && sCurr > 0) : (sPrev > 0 && sCurr < 0);
}
