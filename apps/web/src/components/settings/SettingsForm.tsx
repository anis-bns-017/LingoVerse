import React, { useState } from "react";
import { toast } from "sonner";

// --- Local type definition (matches Prisma Settings model) ---
interface Settings {
  id?: string;
  userId?: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  soundEffects: boolean;
  theme: string; // 'light' | 'dark' | 'system'
  language: string;
  dailyReminderTime?: string[];
  shareActivityWithFriends: boolean;
  showOnlineStatus: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// --- Mock hook (replace with your actual import if it works) ---
// If your real hook exports useSettings, you can import it and use it.
// Example: import { useSettings } from '../../hooks/useSettings';
const useSettings = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const updateSettings = async (data: Partial<Settings>) => {
    setIsUpdating(true);
    // Simulate API call
    console.log("Updating settings:", data);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsUpdating(false);
  };
  return { updateSettings, isUpdating };
};

interface SettingsFormProps {
  settings: Settings;
}

export const SettingsForm: React.FC<SettingsFormProps> = ({ settings }) => {
  const { updateSettings, isUpdating } = useSettings();
  const [formData, setFormData] = useState(settings);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings(formData);
      toast.success("Settings saved successfully! ⚙️");
    } catch (error) {
      toast.error("Failed to save settings");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-lg shadow p-6 max-w-2xl mx-auto"
    >
      <h3 className="text-xl font-bold mb-4">Settings</h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Email Notifications
          </label>
          <input
            type="checkbox"
            name="emailNotifications"
            checked={formData.emailNotifications}
            onChange={handleChange}
            className="w-5 h-5 text-blue-600"
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Push Notifications
          </label>
          <input
            type="checkbox"
            name="pushNotifications"
            checked={formData.pushNotifications}
            onChange={handleChange}
            className="w-5 h-5 text-blue-600"
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Sound Effects
          </label>
          <input
            type="checkbox"
            name="soundEffects"
            checked={formData.soundEffects}
            onChange={handleChange}
            className="w-5 h-5 text-blue-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Theme
          </label>
          <select
            name="theme"
            value={formData.theme}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Language
          </label>
          <select
            name="language"
            value={formData.language}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="ja">Japanese</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Share Activity with Friends
          </label>
          <input
            type="checkbox"
            name="shareActivityWithFriends"
            checked={formData.shareActivityWithFriends}
            onChange={handleChange}
            className="w-5 h-5 text-blue-600"
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Show Online Status
          </label>
          <input
            type="checkbox"
            name="showOnlineStatus"
            checked={formData.showOnlineStatus}
            onChange={handleChange}
            className="w-5 h-5 text-blue-600"
          />
        </div>

        <button
          type="submit"
          disabled={isUpdating}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isUpdating ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </form>
  );
};
