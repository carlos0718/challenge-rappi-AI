import type Anthropic from "@anthropic-ai/sdk";

type Message = Anthropic.MessageParam;

const store = new Map<string, Message[]>();

export function getHistory(sessionId: string): Message[] {
  return store.get(sessionId) ?? [];
}

export function appendMessage(sessionId: string, message: Message): void {
  if (!store.has(sessionId)) store.set(sessionId, []);
  store.get(sessionId)!.push(message);
}

export function clearSession(sessionId: string): void {
  store.delete(sessionId);
}
