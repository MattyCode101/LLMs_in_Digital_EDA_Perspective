"use client";

import { useState } from "react";
import SankeyDiagramRole from "./SankeyDiagram-Role";
import Timeline2D from "./Timeline2D";

type ViewKey = "sankey" | "timeline";

const VIEWS: { key: ViewKey; label: string }[] = [
  { key: "sankey", label: "Taxonomy Sankey" },
  { key: "timeline", label: "Temporal Maturity" },
];

export default function Home() {
  const [view, setView] = useState<ViewKey>("sankey");

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="sticky top-0 z-50 flex gap-2 border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
              view === v.key
                ? "bg-slate-800 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {v.label}
          </button>
        ))}
      </nav>

      {view === "sankey" && <SankeyDiagramRole />}
      {view === "timeline" && <Timeline2D />}
    </div>
  );
}
