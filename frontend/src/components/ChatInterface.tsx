import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage, InsightQueryResponse } from "../types/api";

interface Props { sessionId: string; }

const SUGGESTIONS = [
  "Top 5 zonas con mayor Lead Penetration esta semana",
  "Compara Perfect Orders entre Wealthy y Non-Wealthy en México",
  "Evolución de Gross Profit UE en Chapinero las últimas 8 semanas",
];

export default function ChatInterface({ sessionId }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);

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
        content: data.answer, suggestions: data.suggestions, timestamp: new Date(),
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
                <button key={q} onClick={() => sendMessage(q)}
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
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm">{msg.content}</p>
              )}

              {msg.suggestions && msg.suggestions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                  <p className="text-xs text-gray-400 font-medium">Sugerencias</p>
                  {msg.suggestions.map((s) => (
                    <button key={s} onClick={() => sendMessage(s)}
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
              {[0, 150, 300].map((d) => (
                <div key={d} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${d}ms` }} />
              ))}
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
}
