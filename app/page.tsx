"use client";
import { useState } from "react";
import type { TF } from "@/lib/types";

type Row = { code: string; dif: number; dea: number; osc: number; signal: string; volCheck: string; };
type Resp = { dataDate: string; tf: TF; rows: Row[] };

export default function Home() {
  const [fast, setFast] = useState(12);
  const [slow, setSlow] = useState(26);
  const [signal, setSignal] = useState(9);
  const [months, setMonths] = useState(4);
  const [volMul, setVolMul] = useState(1.2);
  const [tf, setTf] = useState<TF>("D");
  const [streak, setStreak] = useState<"ALL"|"UP3"|"DOWN3">("ALL");

  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<Resp | null>(null);

  async function run() {
    setLoading(true); setResp(null);
    const res = await fetch("/api/screener", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fast, slow, signal, months, volumeMultiplier: volMul, tf, streak }),
    });
    const data = await res.json();
    setResp(data);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <h1 className="text-2xl font-bold">台股 MACD 選股工具（MVP）</h1>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl shadow p-4 space-y-3">
            <h2 className="font-semibold">輸入參數</h2>

            <div className="grid grid-cols-3 gap-2">
              <Input label="EMA 快" value={fast} onChange={setFast} />
              <Input label="EMA 慢" value={slow} onChange={setSlow} />
              <Input label="Signal" value={signal} onChange={setSignal} />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Input label="抓取月數" value={months} onChange={setMonths} />
              <InputFloat label="量能倍數" value={volMul} onChange={setVolMul} />
              <div>
                <label className="block text-xs">資料頻率</label>
                <select className="w-full border rounded p-1" value={tf} onChange={(e)=>setTf(e.target.value as TF)}>
                  <option value="D">日線</option>
                  <option value="W">週線</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs">篩選條件</label>
              <select className="w-full border rounded p-1" value={streak} onChange={(e)=>setStreak(e.target.value as any)}>
                <option value="ALL">全部</option>
                <option value="UP3">連續三日/週 DIF 增加</option>
                <option value="DOWN3">連續三日/週 DIF 減少</option>
              </select>
            </div>

            <button onClick={run} disabled={loading} className="w-full mt-2 rounded-xl bg-black text-white py-2 disabled:opacity-50">
              {loading ? "篩選中…" : "開始選股"}
            </button>
          </div>

          <div className="md:col-span-2 bg-white rounded-2xl shadow p-4">
            <h2 className="font-semibold mb-2">輸出結果</h2>

            {/* 日期提示 */}
            {resp && (
              <p className="text-sm text-gray-600 mb-2">
                📅 數據日期：{resp.dataDate}（最新收盤）
                {resp.tf === "W" ? "；顯示為週線" : ""}
              </p>
            )}

            {!resp && !loading && <p className="text-gray-500">尚未執行。請調整參數後點「開始選股」。</p>}
            {loading && <p className="animate-pulse">計算中，請稍候…</p>}
            {resp?.rows?.length === 0 && <p className="text-gray-500">沒有符合條件的股票。</p>}

            {resp?.rows?.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead><tr className="text-left border-b">
                    <Th>代碼</Th><Th>DIF</Th><Th>DEA</Th><Th>OSC</Th><Th>訊號</Th><Th>量能</Th>
                  </tr></thead>
                  <tbody>
                    {resp.rows.map((r) => (
                      <tr key={r.code} className="border-b hover:bg-gray-50">
                        <Td mono>{r.code}</Td>
                        <Td>{r.dif}</Td>
                        <Td>{r.dea}</Td>
                        <Td>{r.osc}</Td>
                        <Td>
                          {r.signal === "GOLDEN" ? <Badge cls="bg-green-100 text-green-700">黃金交叉</Badge> :
                           r.signal === "DEAD"   ? <Badge cls="bg-red-100 text-red-700">死亡交叉</Badge> :
                                                   <Badge cls="bg-gray-100 text-gray-700">—</Badge>}
                        </Td>
                        <Td>{r.volCheck === "OK" ? "放大" : r.volCheck === "LOW" ? "不足" : "—"}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </div>

        <p className="text-xs text-gray-500">資料來源：TWSE 日K API（收盤後更新）。僅供教學示範，非投資建議。</p>
      </div>
    </main>
  );
}

function Input({ label, value, onChange }: {label: string; value: number; onChange: (v:number)=>void}) {
  return (
    <div>
      <label className="block text-xs">{label}</label>
      <input type="number" className="w-full border rounded p-1" value={value} onChange={(e)=>onChange(parseInt(e.target.value))} />
    </div>
  );
}
function InputFloat({ label, value, onChange }: {label: string; value: number; onChange: (v:number)=>void}) {
  return (
    <div>
      <label className="block text-xs">{label}</label>
      <input type="number" step="0.1" className="w-full border rounded p-1" value={value} onChange={(e)=>onChange(parseFloat(e.target.value))} />
    </div>
  );
}
function Th({ children }: any){ return <th className="p-2">{children}</th> }
function Td({ children, mono }: any){ return <td className={`p-2 ${mono?'font-mono':''}`}>{children}</td> }
function Badge({ children, cls }: any){ return <span className={`rounded-full px-2 py-1 text-xs ${cls}`}>{children}</span> }
