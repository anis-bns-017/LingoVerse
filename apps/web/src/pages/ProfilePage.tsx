import React, { useState } from "react";
import { useProfile } from "../hooks/useProfile";
import { ProfileCard } from "../components/profile/ProfileCard";
import { EditProfileForm } from "../components/profile/EditProfileForm";
import { useAuth } from "../contexts/AuthContext";
import {
  User,
  BarChart3,
  Settings,
  Zap,
  Flame,
  Globe2,
  Trophy,
  Loader2,
  AlertCircle,
  Shield,
  Bell,
} from "lucide-react";

type Tab = "profile" | "stats" | "settings";

export const ProfilePage = () => {
  const { user } = useAuth();
  const { profile, isLoading, error } = useProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-500">
          Loading profile details...
        </p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl border border-rose-100 shadow-sm text-center space-y-3 max-w-sm">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            Failed to Load Profile
          </h3>
          <p className="text-xs text-slate-500">
            We couldn't retrieve your user information right now. Please try again.
          </p>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "profile", label: "Profile Details", icon: <User className="w-4 h-4" /> },
    { id: "stats", label: "Stats & Progress", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "settings", label: "Account Settings", icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Tabs Header */}
        <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex flex-wrap gap-1 border-b-0">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all select-none ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-100"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="transition-all">
            {isEditing ? (
              <EditProfileForm
                profile={profile}
                onCancel={() => setIsEditing(false)}
                onSuccess={() => setIsEditing(false)}
              />
            ) : (
              <ProfileCard profile={profile} onEdit={() => setIsEditing(true)} />
            )}
          </div>
        )}

        {/* Stats & Progress Tab */}
        {activeTab === "stats" && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Learning Milestones</h3>
                <p className="text-xs text-slate-500">
                  Track your consistency, earned experience points, and active languages
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                <Trophy className="w-5 h-5" />
              </div>
            </div>

            {/* Metrics Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100/60 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-800">
                    {profile.xp || 0}
                  </p>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Total XP
                  </p>
                </div>
              </div>

              <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-100/60 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                  <Flame className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-800">
                    {profile.streak || 0} Days
                  </p>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Current Streak
                  </p>
                </div>
              </div>

              <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100/60 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Globe2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-800">
                    {profile.learningLanguages?.length || 0}
                  </p>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Active Languages
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Account Preferences</h3>
              <p className="text-xs text-slate-500">
                Manage notifications, privacy controls, and security configurations
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-xl text-slate-600 border border-slate-200">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">
                      Study Reminders
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Receive daily notifications to maintain your learning streak
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-xl text-slate-600 border border-slate-200">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">
                      Public Profile
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Allow other learners to view your streak and XP stats
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};