'use client';

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { chatService, ChatSource } from '@/src/services/chatService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
}

// ─── Citation list (collapsible) ──────────────────────────────────────────────

function CitationList({ sources }: { sources: ChatSource[] }) {
  const [open, setOpen] = useState(false);
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
      >
        <svg
          className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M7.293 4.707a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L11.586 10 7.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
        {sources.length} {sources.length === 1 ? 'source' : 'sources'}
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {sources.map((src, i) => (
            <div
              key={`${src.documentId}-${src.chunkIndex}-${i}`}
              className="bg-gray-50 border border-gray-200 rounded-xl p-3"
            >
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-gray-800">
                  {src.documentName || src.fileName}
                </span>
                <span className="text-gray-300">·</span>
                <span className="text-xs text-gray-500">Chunk {src.chunkIndex + 1}</span>
                <span className="text-gray-300">·</span>
                <span className="text-xs font-medium text-indigo-600">
                  {(src.score * 100).toFixed(0)}% match
                </span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed line-clamp-4">
                {src.text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-end gap-3 px-4 py-1">
      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
        AI
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

// ─── Suggestion chip ──────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'What is the leave approval process?',
  'What is the dress code policy?',
  'What are the working hours?',
  'How is performance evaluated?',
];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    // Optimistically render user bubble immediately
    const tempId = `user-${Date.now()}`;
    const assistantTempId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempId, role: 'user', content: trimmed },
      { id: assistantTempId, role: 'assistant', content: '' },
    ]);
    setInput('');
    setError(null);
    setIsLoading(true);

    try {
      await chatService.streamQuery(
        {
          query: trimmed,
          conversationId: conversationId ?? undefined,
          maxResults: 5,
          scoreThreshold: 0.5,
        },
        {
          onToken: (token) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantTempId
                  ? { ...m, content: `${m.content}${token}` }
                  : m
              )
            );
          },
          onDone: (payload) => {
            if (payload.conversationId) {
              setConversationId(payload.conversationId);
            }
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantTempId
                  ? {
                      ...m,
                      content: payload.answer || m.content,
                      sources: payload.sources || [],
                    }
                  : m
              )
            );
          },
          onError: (message) => {
            setError(message);
          },
        }
      );
    } catch (err) {
      // Remove optimistic bubbles on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempId && m.id !== assistantTempId));
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setConversationId(null);
    setError(null);
    setInput('');
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-50">

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Knowledge Copilot</h1>
          <p className="text-xs text-gray-500">Answers sourced from your uploaded documents</p>
        </div>
        <button
          onClick={handleNewChat}
          className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </button>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto py-6 space-y-1">

        {/* Empty state with suggestion chips */}
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4 text-3xl">
              🔍
            </div>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">
              Ask your knowledge base
            </h2>
            <p className="text-sm text-gray-500 max-w-sm mb-8">
              The AI will search your uploaded documents and answer with cited sources.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-left text-sm px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 text-gray-700 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat bubbles */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-end gap-3 px-4 py-1 ${
              msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold self-start mt-1">
                AI
              </div>
            )}

            <div
              className={`flex flex-col max-w-[75%] ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white px-4 py-3 rounded-2xl rounded-br-sm text-sm leading-relaxed'
                    : 'bg-white border border-gray-200 text-gray-800 px-4 py-3 rounded-2xl rounded-bl-sm text-sm leading-relaxed shadow-sm'
                }
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>

              {/* Collapsible citations under assistant bubble */}
              {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                <div className="px-1 w-full">
                  <CitationList sources={msg.sources} />
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator while waiting */}
        {isLoading && <TypingIndicator />}

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="mx-4 mb-2 flex items-center justify-between gap-3 px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600 flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Input bar ── */}
      <div className="bg-white border-t border-gray-200 px-4 py-4 flex-shrink-0">
        <form
          onSubmit={handleSubmit}
          className="flex items-end gap-3 max-w-4xl mx-auto"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question… (Enter to send, Shift+Enter for new line)"
            rows={1}
            disabled={isLoading}
            className="flex-1 resize-none rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 overflow-y-auto"
            style={{ minHeight: '48px', maxHeight: '128px' }}
          />

          {/* Send button */}
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-12 h-12 flex-shrink-0 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5 rotate-90" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11h2v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-2">
          Answers are based on your uploaded documents only.
        </p>
      </div>
    </div>
  );
}
