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
  AudioLines,
  Menu,
  X,
} from "lucide-react";

export const DashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [socialOpen, setSocialOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { to: "/vocabulary", label: "Vocabulary", icon: BookOpen },
    { to: "/chat", label: "Chat", icon: MessageCircle },
    { to: "/voice", label: "Voice", icon: AudioLines },
    { to: "/flashcards", label: "Flashcards", icon: Layers },
    { to: "/grammar", label: "Grammar", icon: FileText },
    { to: "/exercises", label: "Exercises", icon: Dumbbell },
    { to: "/progress", label: "Progress", icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Header */}
      <nav className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo + Desktop Nav */}
            <div className="flex items-center gap-8">
              <Link to="/dashboard" className="flex items-center gap-2.5 shrink-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-black text-xl shadow-md shadow-indigo-200/60">
                  L
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent hidden sm:block">
                  LingoVerse
                </span>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden lg:flex items-center gap-0.5">
                {navLinks.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/70 transition-colors"
                  >
                    <Icon className="w-4 h-4 text-slate-400" />
                    {label}
                  </Link>
                ))}

                {/* Social Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setSocialOpen(!socialOpen)}
                    onBlur={() => setTimeout(() => setSocialOpen(false), 200)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/70 transition-colors"
                  >
                    <Users className="w-4 h-4 text-slate-400" />
                    Social
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {socialOpen && (
                    <div className="absolute left-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-20 animate-in fade-in zoom-in-95 duration-100">
                      <Link
                        to="/friends"
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600"
                      >
                        <Users className="w-4 h-4" /> Friends
                      </Link>
                      <Link
                        to="/suggestions"
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600"
                      >
                        <Sparkles className="w-4 h-4" /> Suggestions
                      </Link>
                      <Link
                        to="/blocked"
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-500 hover:bg-slate-50 hover:text-indigo-600"
                      >
                        <UserX className="w-4 h-4" /> Blocked Users
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Streak */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200/70 rounded-full text-amber-700 font-semibold text-xs">
                <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>12 Day Streak</span>
              </div>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  onBlur={() => setTimeout(() => setUserMenuOpen(false), 200)}
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center font-bold text-indigo-700 text-sm">
                    {user?.name ? user.name[0].toUpperCase() : "U"}
                  </div>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-20">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {user?.name || "Learner"}
                      </p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {user?.email || "user@example.com"}
                      </p>
                    </div>
                    <Link
                      to="/profile"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <User className="w-4 h-4 text-slate-400" /> Profile
                    </Link>
                    <Link
                      to="/settings"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Settings className="w-4 h-4 text-slate-400" /> Settings
                    </Link>
                    <div className="border-t border-slate-100 my-1" />
                    <button
                      onClick={logout}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 text-left"
                    >
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-100 bg-white">
            <div className="px-4 py-3 space-y-1">
              {navLinks.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                >
                  <Icon className="w-4 h-4 text-slate-400" />
                  {label}
                </Link>
              ))}
              <div className="pt-2 border-t border-slate-100 mt-2">
                <p className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Social
                </p>
                <Link
                  to="/friends"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Users className="w-4 h-4" /> Friends
                </Link>
                <Link
                  to="/suggestions"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Sparkles className="w-4 h-4" /> Suggestions
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Banner */}
        <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 rounded-3xl p-7 sm:p-8 text-white shadow-xl shadow-indigo-200/40">
          <div className="relative z-10 max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full text-xs font-medium text-indigo-100 mb-4">
              Spanish · Intermediate (B1)
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
              Welcome back, {user?.name || "Learner"}!
            </h1>
            <p className="text-indigo-100/90 text-sm leading-relaxed mb-6 max-w-md">
              You’re making great progress! You’ve completed{" "}
              <span className="font-semibold text-white">80%</span> of your weekly
              goal. Keep the momentum going today.
            </p>
            <button
              onClick={() => navigate("/exercises")}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-700 hover:bg-indigo-50 font-semibold rounded-xl text-sm transition-all shadow-sm hover:shadow"
            >
              Resume Today’s Lesson
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Decorative blobs */}
          <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 right-1/4 w-56 h-56 rounded-full bg-violet-400/20 blur-2xl pointer-events-none" />
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            {
              icon: Flame,
              label: "Streak",
              value: "12 Days",
              color: "bg-amber-50 text-amber-600",
            },
            {
              icon: BookOpen,
              label: "Words Learned",
              value: "342",
              color: "bg-indigo-50 text-indigo-600",
            },
            {
              icon: Clock,
              label: "Time Spent",
              value: "14.5h",
              color: "bg-emerald-50 text-emerald-600",
            },
            {
              icon: Award,
              label: "Total XP",
              value: "2,450",
              color: "bg-violet-50 text-violet-600",
            },
          ].map(({ icon: Icon, label, value, color }) => (
            <div
              key={label}
              className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100/80 shadow-sm flex items-center gap-3.5"
            >
              <div
                className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center shrink-0`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide truncate">
                  {label}
                </p>
                <p className="text-lg sm:text-xl font-bold text-slate-800 truncate">
                  {value}
                </p>
              </div>
            </div>
          ))}
        </section>

        {/* Learning Hub */}
        <section>
          <div className="flex items-end justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Learning Hub</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Choose an activity to start practicing
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[
              {
                to: "/vocabulary",
                title: "Vocabulary",
                desc: "Expand your word bank with spaced repetition.",
                icon: BookOpen,
                color: "indigo",
              },
              {
                to: "/flashcards",
                title: "Flashcards",
                desc: "Master difficult terms using interactive cards.",
                icon: Layers,
                color: "violet",
              },
              {
                to: "/grammar",
                title: "Grammar Rules",
                desc: "Understand tense usage, syntax, and structures.",
                icon: FileText,
                color: "sky",
              },
              {
                to: "/exercises",
                title: "Interactive Exercises",
                desc: "Test your skills with quizzes and listening drills.",
                icon: Dumbbell,
                color: "emerald",
              },
              {
                to: "/chat",
                title: "AI Chat Practice",
                desc: "Have real conversations and get instant feedback.",
                icon: MessageCircle,
                color: "rose",
              },
              {
                to: "/voice",
                title: "Voice Rooms",
                desc: "Practice speaking with others in live rooms.",
                icon: AudioLines,
                color: "amber",
              },
            ].map(({ to, title, desc, icon: Icon, color }) => (
              <Link
                key={to}
                to={to}
                className={`group bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-${color}-200 transition-all duration-200`}
              >
                <div
                  className={`w-10 h-10 rounded-xl bg-${color}-50 text-${color}-600 flex items-center justify-center mb-4 group-hover:bg-${color}-600 group-hover:text-white transition-colors`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">
                  {title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};