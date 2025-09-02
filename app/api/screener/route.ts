// app/api/screener/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchDailyKbars, toWeekly } from "@/lib/twse";
import { macd, lastSignal, crossedZero, isMonotonicStreak, slopeTurn } from "@/lib/macd";
import type { ScreenerParams, ScreenerRow, ScreenerResponse } from "@/lib/types";

export const runtime = "edge";

const DEFAULT_TWSE_POOL = [
  "1101","1216","1301","1303","1402","2002","2105","2207","2301","2303","2308","2317","2327","2330",
  "2356","2357","2379","2382","2408","2412","2454","2474","2603","2609","2615","2618","2610",
  "2801","2880","2881","2882","2883","2884","2885","2886","2891","2892",
  "3008","3034","3037","3045","3231","3481","3711","4904","4938","6505","6669","8046","8069"
];

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<ScreenerParams>;
    const fast    = body.fast   ?? 12;
    const slow    = body.slow   ?? 26;
    const signal  = body.signal ?? 9;
    const months  = Math.max(3, Math.min(12, body.months ?? 4));
    const tf      = body.tf     ?? "D";
    const volMul  = body.volumeMultiplier ?? 1.2;
    const filter  = body.filter ?? "ALL";
    const streakLen = body.streakLen ?? 3;

    const rows: ScreenerRow[] = [];
    let latestDate = "0000-00-00";

    await Promise.all(DEFAULT_TWSE_POOL.map(async (code) => {
      const daily = await fetchDailyKbars(code, months);
      if (daily.length < slow + signal + 5) {
        rows.push({ code, dif: 0, dea: 0, osc: 0, signal: "NONE", volCheck: "NA" });
        return;
      }

      // 準備兩套頻率的資料：日線 & 週線
      const weekly = toWeekly(daily);

      // 以畫面選擇的 tf 決定輸出用序列
      const seriesForOutput = tf === "D" ? daily : weekly;
      const closesOut = seriesForOutput.map(k => k.close);
      const volsOut   = seriesForOutput.map(k => k.volume);
      const lastK  = seriesForOutput.at(-1)!;
      if (lastK.date > latestDate) latestDate = lastK.date;

      // 也各自計算日/週的 MACD，供篩選條件使用
      const { dif: difD, dea: deaD, osc: oscD } = macd(daily.map(k => k.close), fast, slow, signal);
      const { dif: difW, dea: deaW, osc: oscW } = macd(weekly.map(k => k.close), fast, slow, signal);

      // 用於輸出顯示的 MACD（依 tf）
      const { dif, dea, osc } = macd(closesOut, fast, slow, signal);
      const sig = lastSignal(dif, dea);

      // 量能過濾（依 tf）：最近一根 > 5MA * 倍數
      let volCheck: "OK" | "LOW" | "NA" = "NA";
      if (volsOut.length >= 5) {
        const ma5 = volsOut.slice(-5).reduce((a, b) => a + b, 0) / 5;
        volCheck = volsOut.at(-1)! > ma5 * volMul ? "OK" : "LOW";
      }

      // ====== 篩選條件（含新複合條件） ======
      const pass =
        filter === "ALL" ? true :
        filter === "MACD_NEG_TO_POS"
          ? crossedZero(osc.at(-2)!, osc.at(-1)!, "UP")
          : filter === "MACD_POS_TO_NEG"
          ? crossedZero(osc.at(-2)!, osc.at(-1)!, "DOWN")
          : filter === "MACD_UP_STREAK"
          ? isMonotonicStreak(osc, streakLen, "UP")
          : filter === "MACD_DOWN_STREAK"
          ? isMonotonicStreak(osc, streakLen, "DOWN")
          : filter === "DIF_TURN_UP"
          ? slopeTurn(dif, "UP")
          : filter === "DIF_TURN_DOWN"
          ? slopeTurn(dif, "DOWN")
          : /* W_UP_AND_D_UP_STREAK：週線上升 + 日線連續上升 */
            (oscW.length >= 4 && oscD.length >= 4
              && oscW.at(-1)! > 0
              && isMonotonicStreak(oscW, 3, "UP")
              && isMonotonicStreak(oscD, 3, "UP"));

      if (!pass) return;

      rows.push({
        code,
        dif: Number(dif.at(-1)!.toFixed(4)),
        dea: Number(dea.at(-1)!.toFixed(4)),
        osc: Number(osc.at(-1)!.toFixed(4)),
        signal: sig,
        volCheck
      });
    }));

    // 排序：黃金交叉優先，其次 OSC 大
    const order = { GOLDEN: 0, NONE: 1, DEAD: 2 } as const;
    rows.sort((a, b) => (order[a.signal] - order[b.signal]) || b.osc - a.osc);

    const payload: ScreenerResponse = { dataDate: latestDate, tf, rows };
    return NextResponse.json(payload);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "bad request" }, { status: 400 });
  }
}
