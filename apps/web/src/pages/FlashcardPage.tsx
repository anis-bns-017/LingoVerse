import React, { useState } from 'react';
import { useFlashcards, useReviewFlashcard } from '../hooks/useLearning';
import { toast } from 'sonner';

export const FlashcardPage = () => {
  const [language, setLanguage] = useState('');
  const [dueOnly, setDueOnly] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const { data, isLoading, refetch } = useFlashcards({ language, dueOnly });
  const reviewMutation = useReviewFlashcard();

  const currentCard = data && data.length > 0 ? data[currentIndex] : null;

  const handleReview = async (difficulty: 'easy' | 'medium' | 'hard') => {
    if (!currentCard) return;
    const id = currentCard.flashcardId || currentCard.vocabularyId;
    if (!id) return;
    try {
      await reviewMutation.mutateAsync({ flashcardId: id, difficulty });
      toast.success('Reviewed!');
      setShowBack(false);
      if (currentIndex < data.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setCurrentIndex(0);
        refetch();
      }
    } catch {
      toast.error('Review failed');
    }
  };

  const reset = () => {
    setCurrentIndex(0);
    setShowBack(false);
    refetch();
  };

  if (isLoading) return <div className="p-6">Loading flashcards...</div>;

  if (!data || data.length === 0) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center">
        <h2 className="text-xl font-bold mb-2">No flashcards due</h2>
        <p className="text-gray-600">Great job! You're all caught up. Come back later.</p>
        <button onClick={reset} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
          Refresh
        </button>
      </div>
    );
  }

  const card = currentCard;
  const front = card?.flashcard?.front || card?.vocabulary?.word || 'Unknown';
  const back = card?.flashcard?.back || card?.vocabulary?.translation || 'No translation';

  return (
    <div className="max-w-xl mx-auto p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Flashcards</h2>
        <div className="text-sm text-gray-500">
          {currentIndex + 1} / {data.length}
        </div>
      </div>

      <div
        className="border rounded-lg p-8 shadow-md bg-white min-h-[200px] flex items-center justify-center cursor-pointer"
        onClick={() => setShowBack(!showBack)}
      >
        <div className="text-center">
          <div className="text-2xl font-medium">{showBack ? back : front}</div>
          <div className="text-sm text-gray-400 mt-2">
            {showBack ? 'Click to flip back' : 'Click to flip'}
          </div>
        </div>
      </div>

      {showBack && (
        <div className="flex justify-center gap-4 mt-6">
          <button
            onClick={() => handleReview('hard')}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Hard
          </button>
          <button
            onClick={() => handleReview('medium')}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          >
            Medium
          </button>
          <button
            onClick={() => handleReview('easy')}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Easy
          </button>
        </div>
      )}

      <div className="flex gap-4 mt-4 justify-center">
        <button
          onClick={() => {
            setShowBack(false);
            setCurrentIndex((prev) => (prev > 0 ? prev - 1 : data.length - 1));
          }}
          className="px-4 py-2 border rounded"
        >
          Previous
        </button>
        <button
          onClick={reset}
          className="px-4 py-2 border rounded"
        >
          Reset
        </button>
      </div>
    </div>
  );
};