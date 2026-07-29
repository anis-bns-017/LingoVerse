import React, { useState } from 'react';
import { useVocabulary, useReviewVocabulary } from '../hooks/useLearning';
import { toast } from 'sonner';

export const VocabularyPage = () => {
  const [language, setLanguage] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [search, setSearch] = useState('');
  const { data, isLoading, refetch } = useVocabulary({ language, difficulty, search });
  const reviewMutation = useReviewVocabulary();

  const handleReview = async (id: string, difficulty: 'easy' | 'medium' | 'hard') => {
    try {
      await reviewMutation.mutateAsync({ vocabularyId: id, difficulty });
      toast.success(`Reviewed as ${difficulty}!`);
      refetch();
    } catch {
      toast.error('Review failed');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Vocabulary</h1>
      <div className="flex flex-wrap gap-4 mb-4">
        <input
          type="text"
          placeholder="Search words..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border rounded flex-1 min-w-[200px]"
        />
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="px-3 py-2 border rounded"
        >
          <option value="">All languages</option>
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
        </select>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="px-3 py-2 border rounded"
        >
          <option value="">All levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
        <button onClick={() => refetch()} className="px-4 py-2 bg-blue-500 text-white rounded">
          Refresh
        </button>
      </div>

      {isLoading && <div>Loading...</div>}
      {data && (
        <div className="space-y-3">
          {data.items.map((item) => (
            <div key={item.id} className="border p-4 rounded shadow-sm flex justify-between items-start">
              <div>
                <div className="font-semibold text-lg">{item.word}</div>
                <div className="text-gray-600">{item.translation}</div>
                {item.exampleSentence && (
                  <div className="text-sm text-gray-500 italic">"{item.exampleSentence}"</div>
                )}
                <div className="text-xs text-gray-400 mt-1">
                  {item.language} • {item.difficulty}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleReview(item.id, 'easy')}
                  className="px-3 py-1 bg-green-500 text-white rounded text-sm"
                >
                  Easy
                </button>
                <button
                  onClick={() => handleReview(item.id, 'medium')}
                  className="px-3 py-1 bg-yellow-500 text-white rounded text-sm"
                >
                  Medium
                </button>
                <button
                  onClick={() => handleReview(item.id, 'hard')}
                  className="px-3 py-1 bg-red-500 text-white rounded text-sm"
                >
                  Hard
                </button>
              </div>
            </div>
          ))}
          <div className="text-sm text-gray-500 mt-2">
            Showing {data.items.length} of {data.total}
          </div>
        </div>
      )}
    </div>
  );
};