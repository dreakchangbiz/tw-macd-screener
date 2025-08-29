import type { Kbar } from "./types";

// 依月份抓當月所有日K（民國年需轉西元）
async function fetchStockMonth(code: string, yyyymm: string) {
  const url = `https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&date=${yyyymm}01&stockNo=${code}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [] as Kbar[];
  const data = await res.json();
  if (data.stat !== "OK" || !Array.isArray(data.data)) return [] as Kbar[];
  const rows: Kbar[] = data.data.map((r: string[]) => {
    const [ry, rm, rd] = r[0].split("/").map((x) => parseInt(x, 10));
    const yyyy = ry + 1911;
    const date = `${yyyy}-${String(rm).padStart(2, "0")}-${String(rd).padStart(2, "0")}`;
    const toNum = (s: string) => Number(String(s).replace(/,/g, "")) || 0;
    return { date, open: toNum(r[1]), high: toNum(r[2]), low: toNum(r[3]), close: toNum(r[4]), volume: toNum(r[5]) };
  });
  return rows;
}

export async function fetchDailyKbars(code: string, months = 4): Promise<Kbar[]> {
  const now = new Date();
  const tasks: Promise<Kbar[]>[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    tasks.push(fetchStockMonth(code, `${y}${m}`));
  }
  const merged = (await Promise.all(tasks)).flat().sort((a, b) => a.date.localeCompare(b.date));
  return merged.filter(k => Number.isFinite(k.close));
}

// 將日K聚合成週K
export function toWeekly(daily: Kbar[]): Kbar[] {
  if (daily.length === 0) return [];
  const weeks: Kbar[] = [];
  let wk: Kbar | null = null;
  let lastWeek = -1;

  for (const k of daily) {
    const d = new Date(k.date);
    const week = getISOWeek(d);
    if (wk === null || week !== lastWeek) {
      if (wk) weeks.push(wk);
      wk = { ...k };
      lastWeek = week;
    } else {
      wk.high = Math.max(wk.high, k.high);
      wk.low = Math.min(wk.low, k.low);
      wk.close = k.close;
      wk.volume += k.volume;
    }
  }
  if (wk) weeks.push(wk);
  return weeks;
}

function getISOWeek(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const diff = (date.getTime() - firstThursday.getTime()) / 86400000;
  return 1 + Math.floor(diff / 7);
}
