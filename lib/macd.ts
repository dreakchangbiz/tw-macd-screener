export function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev: number | undefined;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (prev === undefined) prev = v;
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
  const osc = dif.map((d, i) => d - dea[i]);
  return { dif, dea, osc };
}

export function lastSignal(dif: number[], dea: number[]): "GOLDEN" | "DEAD" | "NONE" {
  if (dif.length < 2) return "NONE";
  const a = dif.at(-2)! - dea.at(-2)!;
  const b = dif.at(-1)! - dea.at(-1)!;
  if (a <= 0 && b > 0) return "GOLDEN";
  if (a >= 0 && b < 0) return "DEAD";
  return "NONE";
}

export function isStreak3(dif: number[], mode: "UP3" | "DOWN3"): boolean {
  if (dif.length < 4) return false;
  const d1 = dif.at(-1)!;  const d2 = dif.at(-2)!;  const d3 = dif.at(-3)!;  const d4 = dif.at(-4)!;
  if (mode === "UP3")   return d2 > d3 && d1 > d2 && d3 > d4;
  if (mode === "DOWN3") return d2 < d3 && d1 < d2 && d3 < d4;
  return false;
}
