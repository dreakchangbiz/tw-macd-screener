import { NextRequest, NextResponse } from "next/server";
import { fetchDailyKbars, toWeekly } from "@/lib/twse";
import { macd, lastSignal, isStreak3 } from "@/lib/macd";
import type { ScreenerParams, ScreenerRow, ScreenerResponse } from "@/lib/types";

export const runtime = "edge";

// 先用「上市權值/熱門股」做預設股票池（之後要全市場可改成從清單API載入）
const DEFAULT_TWSE_POOL = [
  "1101","1216","1301","1303","1402","2002","2105","2207","2301","2303","2308","2317","2327","2330",
  "2356","2357","2379","2382","2408","2412","2454","2474","2603","2609","2615","2618","2610",
  "2801","2880","2881","2882","2883","2884","2885","2886","2891","2892",
  "3008","3034","3037","3045","3231","3481","3711","4904","4938","6505","6669","8046","8069"
];

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<ScreenerParams>;
    const fast   = body.fast   ?? 12;
    const slow   = body.slow   ?? 26;
    const signal = body.signal ?? 9;
    const months = Math.max(3, Math.min(12, body.months ?? 4));
    const tf     = body.tf     ?? "D";
    const volMul = body.volumeMultiplier ?? 1.2;
    const streak = body.streak ?? "ALL";

    const rows: ScreenerRow[] = [];

    await Promise.all(DEFAULT_TWSE_POOL.map(async (code) => {
      const daily = await fetchDailyKbars(code, months);
      if (daily.length < slow + signal + 5) {
        rows.push({ code, dif: 0, dea: 0, osc: 0, signal: "NONE", volCheck: "NA" });
        return;
      }
      const series = tf === "D" ? daily : toWeekly(daily);
      const closes = series.map(k => k.close);
      const vols   = series.map(k => k.volume);
      const { dif, dea, osc } = macd(closes, fast, slow, signal);
      const sig = lastSignal(dif, dea);

      // 量能過濾：最近一根 > 最近5根均量 * volMul
      let volCheck: "OK" | "LOW" | "NA" = "NA";
      if (vols.length >= 5) {
        const ma5 = vols.slice(-5).reduce((a, b) => a + b, 0) / 5;
        volCheck = vols.at(-1)! > ma5 * volMul ? "OK" : "LOW";
      }

      // 連三日/週 DIF 增減過濾
      if (streak === "UP3" && !isStreak3(dif, "UP3"))   return;
      if (streak === "DOWN3" && !isStreak3(dif, "DOWN3")) return;

      rows.push({
        code,
        dif: Number(dif.at(-1)!.toFixed(4)),
        dea: Number(dea.at(-1)!.toFixed(4)),
        osc: Number(osc.at(-1)!.toFixed(4)),
        signal: sig,
        volCheck
      });
    }));

    // 排序：黃金交叉優先，其次OSC大
    const order = { GOLDEN: 0, NONE: 1, DEAD: 2 } as const;
    rows.sort((a, b) => (order[a.signal] - order[b.signal]) || b.osc - a.osc);

    // 資料日期（最後一根K的日期）
    const dataDate = new Date().toISOString().slice(0,10); // 先以今天為名目日期；實務上可改回傳每檔最後K的最晚日期

    const payload: ScreenerResponse = { dataDate, tf, rows };
    return NextResponse.json(payload);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "bad request" }, { status: 400 });
  }
}
