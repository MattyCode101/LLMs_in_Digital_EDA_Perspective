import React, { useMemo } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceArea
} from 'recharts';

/* ═══════════════════════════════════════════════════════════════════
   HARDCODED PAPER DATA  —  46 papers from Cutdown_Database.csv
   Ranked columns:
     ev = Evaluation Focus   (1 Syntactic, 2 Functional, 3 PPA)
     sc = Design Scope       (1 Fragment, 2 Single-Pass, 3 Agentic, 4 Hierarchical, 5 End-to-end)
     ex = Explainability     (1 Black Box, 2 CoT, 3 Retrieval-Grounded, 4 Pipeline Stage, 5 Deterministic Trace)
     au = Degree of Automation (1 Human-in-the-loop, 2 Human-guided, 3 Full Flow)
     cx = Context Scope      (1 Query-Only, 2 Few-Shot, 3 Repository, 4 Holistic)
   ═══════════════════════════════════════════════════════════════════ */

type Paper = {
  n: string;
  d: string;
  ev: number;
  sc: number;
  ex: number;
  au: number;
  cx: number;
  ts: number;
  yr: number;
};

type DimKey = 'ev' | 'sc' | 'ex' | 'au' | 'cx';

type TickMap = { [key: number]: string };

const PAPERS_RAW: Omit<Paper, 'ts' | 'yr'>[] = [
  // ─── 2023 (9 papers) ───
  { n:"Chip-Chat",         d:"2023-05-22", ev:1, sc:5, ex:2, au:1, cx:1 },
  { n:"ChipGPT",           d:"2023-05-23", ev:3, sc:4, ex:1, au:1, cx:2 },
  { n:"VeriGen",           d:"2023-07-28", ev:2, sc:1, ex:1, au:2, cx:2 },
  { n:"RTLLM v1",          d:"2023-08-10", ev:2, sc:2, ex:2, au:2, cx:1 },
  { n:"ChatEDA",           d:"2023-08-20", ev:2, sc:2, ex:2, au:1, cx:1 },
  { n:"GPT4AIGChip",       d:"2023-09-19", ev:2, sc:4, ex:4, au:1, cx:2 },
  { n:"ChipNeMo",          d:"2023-10-31", ev:1, sc:2, ex:3, au:2, cx:4 },
  { n:"AutoChip",          d:"2023-11-08", ev:2, sc:3, ex:1, au:3, cx:1 },
  { n:"RTLFixer",          d:"2023-11-28", ev:1, sc:3, ex:3, au:2, cx:2 },
  { n:"VeriPPA",           d:"2023-12-02", ev:3, sc:3, ex:1, au:2, cx:2 },
  // ─── 2024 (10 papers) ───
  { n:"Make Every Move",   d:"2024-02-05", ev:3, sc:2, ex:1, au:2, cx:1 },
  { n:"Data ALYN",         d:"2024-03-17", ev:1, sc:2, ex:1, au:2, cx:1 },
  { n:"VeriSeek",          d:"2024-07-21", ev:2, sc:2, ex:1, au:3, cx:1 },
  { n:"VerilogCoder",      d:"2024-08-15", ev:2, sc:4, ex:5, au:3, cx:3 },
  { n:"RTLRewriter",       d:"2024-09-04", ev:3, sc:3, ex:2, au:3, cx:3 },
  { n:"CraftRTL",          d:"2024-09-19", ev:2, sc:2, ex:1, au:2, cx:2 },
  { n:"AutoChip v2",       d:"2024-11-01", ev:2, sc:3, ex:2, au:2, cx:1 },
  { n:"AIvril2",           d:"2024-11-21", ev:2, sc:3, ex:1, au:2, cx:1 },
  { n:"MAGE",              d:"2024-12-10", ev:2, sc:3, ex:2, au:3, cx:1 },
  { n:"HiVeGen",           d:"2024-12-06", ev:3, sc:4, ex:2, au:1, cx:3 },
  { n:"RTL Agent",         d:"2024-12-17", ev:2, sc:3, ex:2, au:2, cx:1 },
  // ─── 2025 (24 papers) ───
  { n:"RTLSquad",          d:"2025-01-06", ev:3, sc:3, ex:4, au:3, cx:1 },
  { n:"EDAid",             d:"2025-02-15", ev:1, sc:2, ex:2, au:3, cx:2 },
  { n:"DeepRTL",           d:"2025-02-20", ev:2, sc:1, ex:1, au:2, cx:1 },
  { n:"ResBench",          d:"2025-03-11", ev:3, sc:2, ex:1, au:3, cx:1 },
  { n:"VeriMind",          d:"2025-03-15", ev:2, sc:3, ex:2, au:1, cx:1 },
  { n:"TuRTLe",            d:"2025-03-31", ev:3, sc:2, ex:2, au:2, cx:1 },
  { n:"CodeGen",           d:"2025-04-19", ev:2, sc:2, ex:1, au:1, cx:1 },
  { n:"CircuitMind",       d:"2025-04-20", ev:3, sc:3, ex:4, au:3, cx:1 },
  { n:"VeriPrefer",        d:"2025-04-22", ev:2, sc:2, ex:1, au:3, cx:1 },
  { n:"HDLxGraph",         d:"2025-05-21", ev:1, sc:4, ex:3, au:2, cx:3 },
  { n:"CVDP",              d:"2025-06-17", ev:2, sc:3, ex:2, au:3, cx:1 },
  { n:"CROP",              d:"2025-07-02", ev:3, sc:3, ex:3, au:3, cx:3 },
  { n:"ChipSeek-R1",       d:"2025-07-07", ev:3, sc:2, ex:2, au:2, cx:1 },
  { n:"Root Cause",        d:"2025-07-09", ev:2, sc:2, ex:3, au:2, cx:1 },
  { n:"VeriOpt",           d:"2025-07-20", ev:3, sc:2, ex:2, au:2, cx:1 },
  { n:"RealBench",         d:"2025-07-22", ev:2, sc:3, ex:1, au:2, cx:3 },
  { n:"MCP4EDA",           d:"2025-07-25", ev:3, sc:3, ex:3, au:2, cx:4 },
  { n:"AutoEDA",           d:"2025-08-01", ev:2, sc:5, ex:2, au:3, cx:2 },
  { n:"AiEDA",             d:"2025-08-15", ev:2, sc:3, ex:3, au:2, cx:1 },
  { n:"LLM-VeriPPA",       d:"2025-09-10", ev:3, sc:3, ex:2, au:1, cx:4 },
  { n:"VeriGRAG",          d:"2025-09-27", ev:2, sc:2, ex:3, au:3, cx:3 },
  { n:"AutoSilicon",       d:"2025-10-21", ev:2, sc:4, ex:3, au:2, cx:3 },
  { n:"VFocus",            d:"2025-11-04", ev:2, sc:2, ex:2, au:3, cx:1 },
  // ─── 2026 (2 papers) ───
  { n:"LaMDA",             d:"2026-01-20", ev:3, sc:3, ex:2, au:1, cx:1 },
  { n:"ACE-RTL",           d:"2026-02-10", ev:2, sc:3, ex:4, au:3, cx:1 },
];

const PAPERS: Paper[] = PAPERS_RAW.map(p => ({
  ...p,
  ts: new Date(p.d).getTime(),
  yr: new Date(p.d).getFullYear(),
}));

// Precompute min/max timestamps for consistent axis scaling and regression calculations
const allTimestamps = PAPERS.map(p => p.ts);
const MIN_TS = new Date("2023-06-01").getTime();
const MAX_TS = new Date("2026-04-01").getTime();

function linReg(pts: {x: number, y: number}[]): {m: number, b: number} {
  const n = pts.length;
  if (n < 2) return { m: 0, b: pts[0]?.y ?? 0 };
  let sx = 0, sy = 0, sxy = 0, sx2 = 0;
  for (const { x, y } of pts) { sx += x; sy += y; sxy += x * y; sx2 += x * x; }
  const det = n * sx2 - sx * sx;
  if (Math.abs(det) < 1e-10) return { m: 0, b: sy / n };
  const m = (n * sxy - sx * sy) / det;
  return { m, b: (sy - m * sx) / n };
}

function jitter(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return (x - Math.floor(x) - 0.5) * 0.28;
}

const Y2024  = new Date("2024-01-01").getTime();
const Y2025  = new Date("2025-01-01").getTime();

const xTicks = [
  new Date("2023-06-01").getTime(), // June '23
  new Date("2024-01-01").getTime(), // Jan '24
  new Date("2025-01-01").getTime(), // Jan '25
  new Date("2026-01-01").getTime(), // Jan '26
];

const DIMENSIONS = [
  { key: 'au' as DimKey, label:'Autonomy', color:'#DC2626',
    ticks:{1:'Human-in-the-Loop',2:'Human Guided',3:'Full Flow'}, domain:[0.4,3.6] },
  { key: 'ev' as DimKey, label:'Evaluation Focus', color:'#2563EB',
    ticks:{1:'Syntactic',2:'Functional',3:'PPA'}, domain:[0.4,3.6] },
  { key: 'ex' as DimKey, label:'Explainability Level', color:'#059669',
    ticks:{1:'Black Box',2:'CoT',3:'Retrieval-Grounded',4:'Flow Decisions',5:'Full Determinism'}, domain:[0.4,5.6] },
];

function formatTick(ts: number): string {
  const d = new Date(ts);
  const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${m[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: { name: string; x: number; raw: number } }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d || !d.name) return null;
  return (
    <div className="bg-white border border-gray-300 rounded px-2 py-1.5 shadow-md text-xs">
      <p className="font-bold text-gray-800">{d.name}</p>
      <p className="text-gray-500">
        {new Date(d.x).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}
      </p>
      <p className="text-gray-600">Rank: {d.raw}</p>
    </div>
  );
}

export default function Figure2() {
  const panels = useMemo(() => {
    return DIMENSIONS.map((cfg) => {
      const pts = PAPERS.map((p, i) => ({
        x: p.ts,
        y: p[cfg.key] + jitter(i * 13 + cfg.key.charCodeAt(0) * 7),
        name: p.n,
        raw: p[cfg.key],
      }));
      const reg = linReg(pts.map(pt => ({ x: pt.x, y: pt.raw })));
      const trend = [
        { x: MIN_TS, y: reg.m * MIN_TS + reg.b },
        { x: MAX_TS, y: reg.m * MAX_TS + reg.b },
      ];
      const slopePerYear = reg.m * 365.25 * 24 * 3600 * 1000;
      // Normalise slope to % of the dimension's full rank scale per year, so
      // dimensions with different numbers of rank levels are comparable.
      const maxRank = Math.max(...Object.keys(cfg.ticks).map(Number));
      const slopePercentPerYear = (slopePerYear / maxRank) * 100;
      return { ...cfg, pts, trend, slopePerYear, slopePercentPerYear };
    });
  }, []);

  return (
    <div className="bg-white p-4 min-h-screen max-w-4xl mx-auto font-sans" style={{ zoom: 1.5 } as React.CSSProperties}>
      <h1 className="text-lg font-bold text-center text-gray-900 mb-0.5">
        LLM in EDA: Temporal Maturity Evolution
      </h1>
      <p className="text-xs text-gray-400 text-center mb-4">
        46 surveyed papers · Jun 2023 – Feb 2026
      </p>

      <div>
        <div className="flex flex-wrap -mx-3">
          {panels.map((p, idx) => {
            const trendDir   = p.slopePerYear > 0.05 ? '↑' : p.slopePerYear < -0.05 ? '↓' : '→';
            const trendColor = p.slopePerYear > 0.05
              ? 'text-emerald-600'
              : p.slopePerYear < -0.05 ? 'text-red-500' : 'text-gray-400';
            return (
              <div key={p.key + idx} className="w-1/3 px-2 mb-4">
                <div className="flex flex-col bg-white">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                           style={{ backgroundColor: p.color }} />
                      <div className="text-sm font-semibold text-gray-700 leading-tight">
                        {p.label}
                      </div>
                    </div>
                    <div className={`text-xs font-mono ${trendColor}`}>
                      {trendDir} {Math.abs(p.slopePercentPerYear).toFixed(1)}%/yr
                    </div>
                  </div>

                  <ResponsiveContainer width="100%" height={160}>
                    <ScatterChart margin={{ top: 4, right: 2, bottom: 2, left: 2 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <ReferenceArea x1={MIN_TS} x2={Y2024}  fill="#FEF9C3" fillOpacity={0.3} />
                      <ReferenceArea x1={Y2024}  x2={Y2025}  fill="#DBEAFE" fillOpacity={0.3} />
                      <ReferenceArea x1={Y2025}  x2={MAX_TS} fill="#D1FAE5" fillOpacity={0.3} />
                      <XAxis
                        type="number" dataKey="x"
                        domain={[MIN_TS, MAX_TS]}
                        ticks={xTicks}
                        tickFormatter={formatTick}
                        interval={0}
                        tick={{ fontSize: 9, fill: '#6B7280' }}
                        axisLine={{ stroke:'#D1D5DB' }}
                        tickLine={{ stroke:'#D1D5DB' }}
                      />
                      <YAxis
                        type="number" dataKey="y"
                        domain={p.domain}
                        ticks={Object.keys(p.ticks).map(Number)}
                        interval={0}
                        allowDataOverflow={true}
                        tickMargin={8}
                        tickFormatter={(v: any) => (p.ticks as TickMap)[v as number] || ''}
                        tick={function YTick(props: { x: number | string; y: number | string; payload: { value: number }; index: number }) {
                          const { x, y, payload, index } = props;
                          const txt   = (p.ticks as TickMap)[payload.value] || String(payload.value);
                          const parts = String(txt).split(/\s+/);
                          const fill  = ['#4B5563','#6B7280'][index % 2];
                          return (
                            <text x={(x as number) - 2} y={(y as number) + 2} textAnchor="end" fontSize={8} fill={fill}>
                              {parts.map((part, i) => (
                                <tspan x={(x as number) - 2} dy={i === 0 ? 0 : 9} key={i}>{part}</tspan>
                              ))}
                            </text>
                          );
                        }}
                        width={90}
                        axisLine={{ stroke:'#D1D5DB' }}
                        tickLine={{ stroke:'#D1D5DB' }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Scatter
                        data={p.pts}
                        fill={p.color} fillOpacity={0.6}
                        stroke={p.color} strokeOpacity={0.9} strokeWidth={1}
                        shape="circle"
                      />
                      <Scatter
                        data={p.trend}
                        fill="transparent" stroke="transparent"
                        line={{ stroke: p.color, strokeWidth: 2.5,
                                strokeDasharray: '10 5', strokeOpacity: 0.7 }}
                        isAnimationActive={false}
                        tooltipType="none"
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })}
        </div>

        {/* legend */}
        <div className="flex justify-center gap-5 text-xs text-gray-500 mt-2 mb-1">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 h-3 rounded-sm bg-yellow-50 border border-yellow-300" /> 2023
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 h-3 rounded-sm bg-blue-50 border border-blue-300" /> 2024
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 h-3 rounded-sm bg-green-50 border border-green-300" /> 2025–26
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="24" height="2">
              <line x1="0" y1="1" x2="24" y2="1" stroke="#6B7280" strokeWidth="2" strokeDasharray="5 3"/>
            </svg>
            Linear trend
          </span>
        </div>
      </div>
    </div>
  );
}
