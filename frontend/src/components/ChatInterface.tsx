import { useState, useRef, useEffect, memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import TrendChart from "./TrendChart";
import BarChart from "./BarChart";
import type { ChatMessage, InsightQueryResponse } from "../types/api";

function markdownToCSV(markdown: string): string | null {
  const lines = markdown.split("\n").filter((l) => l.trim().startsWith("|"));
  if (lines.length < 2) return null;
  const rows = lines
    .filter((l) => !l.match(/^\|[\s:-]+\|/))
    .map((l) =>
      l
        .split("|")
        .slice(1, -1)
        .map((cell) => `"${cell.trim().replace(/"/g, '""')}"`)
        .join(",")
    );
  return rows.join("\n");
}

function downloadCSV(csv: string, filename = "reporte.csv") {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const TABLE_COMPONENTS: Components = {
  table: ({ children }) => (
    <div className="overflow-x-auto my-3 rounded-xl border border-gray-200 shadow-sm">
      <table className="min-w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-orange-50 border-b border-orange-200">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-gray-100">{children}</tbody>
  ),
  tr: ({ children }) => (
    <tr className="hover:bg-gray-50 transition-colors">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-4 py-2.5 text-left text-xs font-semibold text-orange-700 uppercase tracking-wide whitespace-nowrap">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{children}</td>
  ),
};

interface Props { sessionId: string; }

const SUGGESTIONS = [
  "Top 5 zonas con mayor Lead Penetration esta semana",
  "Compara Perfect Orders entre Wealthy y Non-Wealthy en México",
  "Evolución de Gross Profit UE en Chapinero las últimas 8 semanas",
];

const ChatInterface = memo(function ChatInterface({ sessionId }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const stored = localStorage.getItem("rappi_chat_messages");
      if (!stored) return [];
      const parsed = JSON.parse(stored) as ChatMessage[];
      return parsed.map((m) => ({ ...m, timestamp: new Date(m.timestamp) }));
    } catch {
      return [];
    }
  });
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem("rappi_chat_messages", JSON.stringify(messages));
    } catch { /* localStorage lleno o no disponible */ }
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(question: string) {
    if (!question.trim() || loading) return;

    setMessages((prev) => [...prev, {
      id: crypto.randomUUID(), role: "user", content: question, timestamp: new Date(),
    }]);
    setInput("");
    setLoading(true);

    try {
      const res  = await fetch("/api/v1/insight-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, sessionId }),
      });
      const data = await res.json() as InsightQueryResponse;
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(), role: "assistant",
        content: data.answer, suggestions: data.suggestions,
        chart_data: data.chart_data?.length ? data.chart_data : undefined,
        timestamp: new Date(),
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(), role: "assistant",
        content: "Error al conectar con el servidor.", timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-20">
            <p className="text-lg font-medium text-gray-700">Sistema de Análisis Inteligente Rappi</p>
            <p className="text-sm mt-1">Consulta métricas operacionales en lenguaje natural</p>
            <div className="mt-6 space-y-2 max-w-lg mx-auto">
              {SUGGESTIONS.map((q) => (
                <button type="button" key={q} onClick={() => sendMessage(q)}
                  className="w-full text-left px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm text-gray-600 transition">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-3xl rounded-2xl px-4 py-3 ${
              msg.role === "user"
                ? "bg-orange-500 text-white"
                : "bg-white border border-gray-200 text-gray-800"
            }`}>
              {msg.role === "assistant" ? (
                <div className="text-sm leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={TABLE_COMPONENTS}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm">{msg.content}</p>
              )}

              {msg.chart_data && msg.chart_data.length > 0 && (
                <div className="mt-3 space-y-3">
                  {msg.chart_data.map((series, i) => {
                    const title = series.zone
                      ? `${series.metric} — ${series.zone}${series.country ? ` (${series.country})` : ""}`
                      : series.metric;
                    return series.type === "bar" ? (
                      <BarChart key={i} metric={title} data={series.points} />
                    ) : (
                      <TrendChart key={i} metric={title} data={series.points} />
                    );
                  })}
                </div>
              )}

              {msg.role === "assistant" && msg.content.includes("|") && markdownToCSV(msg.content) && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      const csv = markdownToCSV(msg.content);
                      if (csv) downloadCSV(csv);
                    }}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-orange-600 transition"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Descargar CSV
                  </button>
                </div>
              )}

              {msg.suggestions && msg.suggestions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                  <p className="text-xs text-gray-400 font-medium">Sugerencias</p>
                  {msg.suggestions.map((s) => (
                    <button type="button" key={s} onClick={() => sendMessage(s)}
                      className="block w-full text-left text-xs text-orange-600 hover:text-orange-800 py-0.5 transition">
                      → {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-200 p-4 bg-white">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex gap-2">
          <input
            value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu pregunta sobre métricas operacionales..."
            disabled={loading}
            className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-50"
          />
          <button type="submit" disabled={loading || !input.trim()}
            className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition">
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
});

export default ChatInterface;
