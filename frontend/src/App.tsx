import { useState, useEffect } from "react";
import ChatInterface from "./components/ChatInterface";
import ReportsPanel  from "./components/ReportsPanel";

type Tab = "chat" | "reports";

export default function App() {
  const [tab, setTab]           = useState<Tab>("chat");
  const [sessionId]             = useState(() => crypto.randomUUID());

  useEffect(() => { document.title = "Rappi AI · Análisis de Operaciones"; }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            R
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gray-900">Rappi AI · Análisis de Operaciones</h1>
            <p className="text-xs text-gray-400">Powered by Claude Sonnet 4.6</p>
          </div>
        </div>

        {/* Tabs */}
        <nav className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(["chat", "reports"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                tab === t
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}>
              {t === "chat" ? "Chat" : "Reportes"}
            </button>
          ))}
        </nav>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        {tab === "chat"
          ? <ChatInterface sessionId={sessionId} />
          : <div className="h-full overflow-y-auto"><ReportsPanel /></div>
        }
      </main>
    </div>
  );
}
