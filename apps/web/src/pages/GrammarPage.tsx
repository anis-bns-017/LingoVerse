import React, { useState } from 'react';
import { useGrammar } from '../hooks/useLearning';

export const GrammarPage = () => {
  const [language, setLanguage] = useState('');
  const [level, setLevel] = useState('');
  const { data, isLoading } = useGrammar({ language, level });

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Grammar Rules</h1>
      <div className="flex gap-4 mb-4">
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
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="px-3 py-2 border rounded"
        >
          <option value="">All levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      {isLoading && <div>Loading...</div>}
      <div className="space-y-4">
        {data?.map((rule) => (
          <div key={rule.id} className="border p-4 rounded shadow-sm">
            <h3 className="text-lg font-semibold">{rule.title}</h3>
            <p className="text-gray-600">{rule.description}</p>
            <div className="mt-2">
              <span className="text-sm font-medium">Examples:</span>
              <ul className="list-disc list-inside text-sm text-gray-700">
                {rule.examples.map((ex, i) => (
                  <li key={i}>{ex}</li>
                ))}
              </ul>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {rule.language} • {rule.level}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};