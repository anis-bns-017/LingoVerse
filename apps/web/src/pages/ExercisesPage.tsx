import React, { useState } from 'react';
import { useExercises, useSubmitExercise } from '../hooks/useLearning';
import { toast } from 'sonner';

export const ExercisesPage = () => {
  const [language, setLanguage] = useState('');
  const [type, setType] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const { data, isLoading, refetch } = useExercises({ language, type, difficulty });
  const submitMutation = useSubmitExercise();

  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});

  const handleSubmit = async (exerciseId: string) => {
    try {
      const answerArray = Object.values(answers);
      const result = await submitMutation.mutateAsync({
        exerciseId,
        answers: answerArray,
        metadata: { submittedAt: new Date().toISOString() },
      });
      toast.success(`Score: ${result.score}%`);
      setSelectedExercise(null);
      setAnswers({});
      refetch();
    } catch {
      toast.error('Submission failed');
    }
  };

  if (isLoading) return <div className="p-6">Loading exercises...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Exercises</h1>
      <div className="flex flex-wrap gap-4 mb-4">
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
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="px-3 py-2 border rounded"
        >
          <option value="">All types</option>
          <option value="GRAMMAR">Grammar</option>
          <option value="VOCABULARY">Vocabulary</option>
          <option value="READING">Reading</option>
          <option value="LISTENING">Listening</option>
          <option value="WRITING">Writing</option>
          <option value="SPEAKING">Speaking</option>
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
      </div>

      <div className="space-y-4">
        {data?.map((ex) => (
          <div key={ex.id} className="border p-4 rounded shadow-sm">
            <h3 className="text-lg font-semibold">{ex.title}</h3>
            <p className="text-gray-600 text-sm">{ex.description}</p>
            <div className="text-xs text-gray-400 mt-1">
              {ex.type} • {ex.language} • {ex.difficulty}
            </div>
            {selectedExercise === ex.id ? (
              <div className="mt-4">
                <div className="bg-gray-50 p-3 rounded border mb-2">
                  <p className="whitespace-pre-wrap">{ex.content}</p>
                </div>
                <input
                  type="text"
                  placeholder="Your answer..."
                  className="w-full px-3 py-2 border rounded mb-2"
                  value={answers[ex.id] || ''}
                  onChange={(e) => setAnswers({ ...answers, [ex.id]: e.target.value })}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSubmit(ex.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded"
                  >
                    Submit
                  </button>
                  <button
                    onClick={() => setSelectedExercise(null)}
                    className="px-4 py-2 border rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setSelectedExercise(ex.id)}
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded text-sm"
              >
                Start Exercise
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};