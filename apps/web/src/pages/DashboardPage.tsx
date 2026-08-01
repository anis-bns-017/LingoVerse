import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Layers,
  FileText,
  Dumbbell,
  TrendingUp,
  Users,
  Sparkles,
  UserX,
  User,
  Settings,
  LogOut,
  Flame,
  Award,
  ChevronDown,
  Clock,
  ArrowRight,
  MessageCircle,
} from "lucide-react";

export const DashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [socialOpen, setSocialOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Header / Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo & Main Nav */}
            <div className="flex items-center gap-8">
              <Link to="/dashboard" className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-black text-xl shadow-md shadow-indigo-200">
                  L
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                  LingoVerse
                </span>
              </Link>

              {/* Primary Learning Links */}
              <div className="hidden md:flex items-center gap-1">
                <Link
                  to="/vocabulary"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-colors"
                >
                  <BookOpen className="w-4 h-4 text-slate-400" />
                  Vocabulary
                </Link>

                <Link
                  to="/chat"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-slate-400" />
                  <span>Chat</span>
                </Link>

                <Link
                  to="/flashcards"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-colors"
                >
                  <Layers className="w-4 h-4 text-slate-400" />
                  Flashcards
                </Link>
                <Link
                  to="/grammar"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-colors"
                >
                  <FileText className="w-4 h-4 text-slate-400" />
                  Grammar
                </Link>
                <Link
                  to="/exercises"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-colors"
                >
                  <Dumbbell className="w-4 h-4 text-slate-400" />
                  Exercises
                </Link>
                <Link
                  to="/progress"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-colors"
                >
                  <TrendingUp className="w-4 h-4 text-slate-400" />
                  Progress
                </Link>

                {/* Social Dropdown Menu */}
                <div className="relative">
                  <button
                    onClick={() => setSocialOpen(!socialOpen)}
                    onBlur={() => setTimeout(() => setSocialOpen(false), 200)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-colors"
                  >
                    <Users className="w-4 h-4 text-slate-400" />
                    Social
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {socialOpen && (
                    <div className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-10 animate-in fade-in zoom-in-95 duration-100">
                      <Link
                        to="/friends"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600"
                      >
                        <Users className="w-4 h-4" /> Friends
                      </Link>
                      <Link
                        to="/suggestions"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600"
                      >
                        <Sparkles className="w-4 h-4" /> Suggestions
                      </Link>
                      <Link
                        to="/blocked"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 text-slate-500"
                      >
                        <UserX className="w-4 h-4" /> Blocked Users
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Side: Quick Stats & User Profile Menu */}
            <div className="flex items-center gap-3">
              {/* Streak Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200/60 rounded-full text-amber-700 font-semibold text-xs">
                <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>12 Day Streak</span>
              </div>

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  onBlur={() => setTimeout(() => setUserMenuOpen(false), 200)}
                  className="flex items-center gap-2 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center font-bold text-indigo-700 text-sm">
                    {user?.name ? user.name[0].toUpperCase() : "U"}
                  </div>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-10">
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {user?.name || "Learner"}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {user?.email || "user@example.com"}
                      </p>
                    </div>
                    <Link
                      to="/profile"
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <User className="w-4 h-4 text-slate-400" /> Profile
                    </Link>
                    <Link
                      to="/settings"
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Settings className="w-4 h-4 text-slate-400" /> Settings
                    </Link>
                    <div className="border-t border-slate-100 my-1" />
                    <button
                      onClick={logout}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
                    >
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Banner */}
        <section className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 rounded-3xl p-8 text-white shadow-xl shadow-indigo-100">
          <div className="relative z-10 max-w-xl">
            <span className="inline-block px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-xs font-medium text-indigo-100 mb-3">
              Spanish • Intermediate (B1)
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight mb-2">
              Welcome back, {user?.name || "Learner"}!
            </h2>
            <p className="text-indigo-100 text-sm leading-relaxed mb-6">
              You're making great progress! You've completed 80% of your weekly
              goal. Keep the momentum going today.
            </p>
            <button
              onClick={() => navigate("/exercises")}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-600 hover:bg-indigo-50 font-semibold rounded-xl text-sm transition-all shadow-sm"
            >
              Resume Today's Lesson
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          {/* Subtle Background Pattern Decorative Shapes */}
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 rounded-full bg-white/5 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 -mb-12 w-60 h-60 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />
        </section>

        {/* Quick Stats Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Streak
              </p>
              <p className="text-xl font-bold text-slate-800">12 Days</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Words Learned
              </p>
              <p className="text-xl font-bold text-slate-800">342 Words</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Time Spent
              </p>
              <p className="text-xl font-bold text-slate-800">14.5 Hours</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Total XP
              </p>
              <p className="text-xl font-bold text-slate-800">2,450 XP</p>
            </div>
          </div>
        </section>

        {/* Learning Modules Grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">Learning Hub</h3>
            <span className="text-xs text-slate-500">
              Choose a activity to start practice
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/vocabulary"
              className="group bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <BookOpen className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">
                Vocabulary
              </h4>
              <p className="text-xs text-slate-500">
                Expand your word bank with spaced repetition.
              </p>
            </Link>

            <Link
              to="/flashcards"
              className="group bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-violet-100 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center mb-4 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-slate-800 mb-1 group-hover:text-violet-600 transition-colors">
                Flashcards
              </h4>
              <p className="text-xs text-slate-500">
                Master difficult terms using interactive cards.
              </p>
            </Link>

            <Link
              to="/grammar"
              className="group bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-sky-100 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-4 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                <FileText className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-slate-800 mb-1 group-hover:text-sky-600 transition-colors">
                Grammar Rules
              </h4>
              <p className="text-xs text-slate-500">
                Understand tense usage, syntax, and structures.
              </p>
            </Link>

            <Link
              to="/exercises"
              className="group bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-100 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Dumbbell className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-slate-800 mb-1 group-hover:text-emerald-600 transition-colors">
                Interactive Exercises
              </h4>
              <p className="text-xs text-slate-500">
                Test your skills with quizzes and listening drills.
              </p>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
};
