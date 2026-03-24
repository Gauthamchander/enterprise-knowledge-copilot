'use client';

import { FormEvent, useState } from 'react';
import { chatService, ChatAnswer } from '@/src/services/chatService';
import Button from '@/src/components/ui/Button';

export default function ChatPage() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<ChatAnswer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setError('Please enter a question.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await chatService.query({
        query: trimmedQuery,
        maxResults: 5,
        scoreThreshold: 0.5,
      });

      setResult(response);
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : 'Failed to fetch answer. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Chat with Knowledge Base</h1>
        <p className="text-gray-600">Ask questions about uploaded documents and get answers with citations.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <label htmlFor="question" className="block text-sm font-medium text-gray-700">
            Your question
          </label>
          <textarea
            id="question"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Example: What are the leave approval rules?"
            rows={4}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            disabled={isLoading}
          />

          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">{error}</div>
          )}

          <div className="flex justify-end">
            <Button type="submit" variant="primary" isLoading={isLoading} disabled={isLoading}>
              {isLoading ? 'Asking...' : 'Ask Question'}
            </Button>
          </div>
        </form>
      </div>

      {result && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Answer</h2>
            <p className="text-gray-700 leading-7 whitespace-pre-wrap">{result.answer}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Citations ({result.sources.length})</h2>

            {result.sources.length === 0 ? (
              <p className="text-sm text-gray-500">No citations available for this response.</p>
            ) : (
              <div className="space-y-4">
                {result.sources.map((source, index) => (
                  <div key={`${source.documentId}-${source.chunkIndex}-${index}`} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex flex-wrap items-center gap-2 text-sm mb-2">
                      <span className="font-medium text-gray-900">{source.documentName || source.fileName}</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-600">Chunk {source.chunkIndex + 1}</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-600">Score: {source.score.toFixed(3)}</span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{source.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

