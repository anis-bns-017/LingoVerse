import React from 'react';
import { useProgress } from '../hooks/useLearning';

export const ProgressPage = () => {
  const { data, isLoading } = useProgress();

  if (isLoading) return <div className="p-6">Loading progress...</div>;

  if (!data) return <div className="p-6">No progress data available.</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Your Progress</h1>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded text-center">
          <div className="text-3xl font-bold text-blue-600">{data.totalXP}</div>
          <div className="text-sm text-gray-600">Total XP</div>
        </div>
        <div className="bg-green-50 p-4 rounded text-center">
          <div className="text-3xl font-bold text-green-600">{data.streak}</div>
          <div className="text-sm text-gray-600">Day Streak</div>
        </div>
        <div className="bg-purple-50 p-4 rounded text-center">
          <div className="text-3xl font-bold text-purple-600">{data.progress.length}</div>
          <div className="text-sm text-gray-600">Active Skills</div>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-3">Skill Breakdown</h2>
      <div className="space-y-3">
        {data.progress.map((item) => (
          <div key={item.id} className="border p-4 rounded shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold">{item.skill}</div>
                <div className="text-sm text-gray-500">
                  {item.language} • {item.level} • {item.completedExercises} exercises
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{item.xp} XP</div>
                {item.mastered && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Mastered</span>
                )}
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${Math.min(100, (item.completedExercises / 10) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};