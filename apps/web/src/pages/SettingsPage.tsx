import React from 'react';
import { useSettings } from '../hooks/useSettings';
import { SettingsForm } from '../components/settings/SettingsForm';

export const SettingsPage = () => {
  const { settings, isLoading, error } = useSettings();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading settings...</div>
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">Failed to load settings</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <SettingsForm settings={settings} />
      </div>
    </div>
  );
};