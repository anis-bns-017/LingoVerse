import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link, NavLink, useNavigate } from "react-router-dom";
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
  PlayCircle,
  BarChart2,
  Hash,
  Mic,
  Radio,
  Headphones,
  Calendar,
  Star,
  Zap,
  Crown,
  Shield,
  Volume2,
  VolumeX,
  Hand,
  PhoneOff,
  Gift,
  Heart,
  ThumbsUp,
  Compass,
  Target,
  Globe,
  MapPin,
  Coffee,
  Music,
  Gamepad2,
  BookMarked,
} from "lucide-react";
import { useVoiceRooms } from "../hooks/useVoice";
import { formatDistanceToNow } from "date-fns";

// Static color map to fix Tailwind JIT dynamic class issue
const colorMap = {
  indigo: {
    bg: "bg-indigo-50",
    text: "text-indigo-600",
    groupHoverBg: "group-hover:bg-indigo-600",
    groupHoverText: "group-hover:text-white",
    ring: "focus:ring-indigo-500/40",
    border: "hover:border-indigo-200",
  },
  violet: {
    bg: "bg-violet-50",
    text: "text-violet-600",
    groupHoverBg: "group-hover:bg-violet-600",
    groupHoverText: "group-hover:text-white",
    ring: "focus:ring-violet-500/40",
    border: "hover:border-violet-200",
  },
  sky: {
    bg: "bg-sky-50",
    text: "text-sky-600",
    groupHoverBg: "group-hover:bg-sky-600",
    groupHoverText: "group-hover:text-white",
    ring: "focus:ring-sky-500/40",
    border: "hover:border-sky-200",
  },
  emerald: {
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    groupHoverBg: "group-hover:bg-emerald-600",
    groupHoverText: "group-hover:text-white",
    ring: "focus:ring-emerald-500/40",
    border: "hover:border-emerald-200",
  },
  rose: {
    bg: "bg-rose-50",
    text: "text-rose-600",
    groupHoverBg: "group-hover:bg-rose-600",
    groupHoverText: "group-hover:text-white",
    ring: "focus:ring-rose-500/40",
    border: "hover:border-rose-200",
  },
  amber: {
    bg: "bg-amber-50",
    text: "text-amber-600",
    groupHoverBg: "group-hover:bg-amber-600",
    groupHoverText: "group-hover:text-white",
    ring: "focus:ring-amber-500/40",
    border: "hover:border-amber-200",
  },
  teal: {
    bg: "bg-teal-50",
    text: "text-teal-600",
    groupHoverBg: "group-hover:bg-teal-600",
    groupHoverText: "group-hover:text-white",
    ring: "focus:ring-teal-500/40",
    border: "hover:border-teal-200",
  },
};

export const DashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data: voiceRooms, isLoading: voiceLoading } = useVoiceRooms();

  const [socialOpen, setSocialOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Filter active voice rooms (not ended)
  const activeVoiceRooms =
    voiceRooms?.filter((room) => room.status !== "ENDED") || [];
  const liveVoiceRooms = activeVoiceRooms.slice(0, 4);
  const hasLiveRooms = liveVoiceRooms.length > 0;

  // Navigation Links
  const navLinks = [
    { to: "/discover", label: "Discover", icon: Compass },
    { to: "/vocabulary", label: "Vocab", icon: BookOpen },
    { to: "/chat", label: "Chat", icon: MessageCircle },
    { to: "/voice", label: "Voice", icon: AudioLines },
    { to: "/communities", label: "Communities", icon: Hash },
    { to: "/flashcards", label: "Cards", icon: Layers },
    { to: "/grammar", label: "Grammar", icon: FileText },
    { to: "/exercises", label: "Practice", icon: Dumbbell },
    { to: "/progress", label: "Progress", icon: TrendingUp },
  ];

  // Learning Hub Items - Added Discover as first item
  const learningHubItems = [
    {
      to: "/discover",
      title: "Discover",
      desc: "Find and join live voice rooms from around the world.",
      icon: Compass,
      color: "indigo",
    },
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
    {
      to: "/communities",
      title: "Communities",
      desc: "Join language communities, share tips, and grow together.",
      icon: Hash,
      color: "teal",
    },
  ];

  // Stats - Added Voice specific stats
  const stats = [
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
    {
      icon: AudioLines,
      label: "Voice Hours",
      value: "8.2h",
      color: "bg-amber-50 text-amber-600",
    },
    {
      icon: Users,
      label: "Rooms Joined",
      value: "24",
      color: "bg-rose-50 text-rose-600",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo + Desktop Nav */}
            <div className="flex items-center gap-8">
              <Link
                to="/dashboard"
                className="flex items-center gap-2.5 shrink-0"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-black text-xl shadow-md shadow-indigo-200/60">
                  L
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent hidden sm:block">
                  LingoVerse
                </span>
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden xl:flex items-center gap-1">
                {navLinks.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? "text-indigo-600 bg-indigo-50/70" : "text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/70"}`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </NavLink>
                ))}

                {/* Social Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setSocialOpen(!socialOpen)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/70 transition-colors"
                  >
                    <Users className="w-4 h-4" />
                    Social
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform ${socialOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {socialOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setSocialOpen(false)}
                      />
                      <div className="absolute left-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-20">
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
                    </>
                  )}
                </div>
              </nav>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Streak */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200/70 rounded-full text-amber-700 font-semibold text-xs">
                <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>12 Days</span>
              </div>

              {/* Voice Live Indicator */}
              {hasLiveRooms && (
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200/70 rounded-full text-red-600 font-semibold text-xs animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <span>{liveVoiceRooms.length} Live</span>
                </div>
              )}

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center font-bold text-indigo-700 text-sm">
                    {user?.name ? user.name[0].toUpperCase() : "U"}
                  </div>
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    />
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
                  </>
                )}
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="xl:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="xl:hidden border-t border-slate-100 bg-white">
            <div className="px-4 py-3 space-y-1">
              {navLinks.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${isActive ? "bg-indigo-50 text-indigo-600" : "text-slate-700 hover:bg-slate-50"}`
                  }
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </NavLink>
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
                <Link
                  to="/blocked"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                >
                  <UserX className="w-4 h-4" /> Blocked Users
                </Link>
              </div>
            </div>
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Banner with Progress Ring */}
        <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 rounded-3xl p-7 sm:p-8 text-white shadow-xl shadow-indigo-200/40 flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="relative z-10 max-w-xl text-center sm:text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full text-xs font-medium text-indigo-100 mb-4">
              Spanish · Intermediate (B1)
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
              Welcome back, {user?.name || "Learner"}! 👋
            </h1>
            <p className="text-indigo-100/90 text-sm leading-relaxed mb-4 max-w-md mx-auto sm:mx-0">
              You're making great progress! Keep the momentum going today.
            </p>

            {/* Quick Action Buttons - Added Discover */}
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              <button
                onClick={() => navigate("/exercises")}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-indigo-700 hover:bg-indigo-50 font-semibold rounded-xl text-sm transition-all shadow-sm hover:shadow"
              >
                <PlayCircle className="w-4 h-4" />
                Resume Lesson
              </button>
              <button
                onClick={() => navigate("/discover")}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-white font-semibold rounded-xl text-sm transition-all backdrop-blur-sm border border-emerald-400/30"
              >
                <Compass className="w-4 h-4" />
                Discover
              </button>
              <button
                onClick={() => navigate("/voice")}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-100 font-semibold rounded-xl text-sm transition-all backdrop-blur-sm"
              >
                <AudioLines className="w-4 h-4" />
                Join Voice
              </button>
              {hasLiveRooms && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/30 text-white rounded-full text-xs font-medium animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  {liveVoiceRooms.length} Live Now
                </span>
              )}
            </div>
          </div>

          {/* Progress Ring */}
          <div className="relative z-10 shrink-0">
            <svg
              className="w-24 h-24 sm:w-28 sm:h-28 -rotate-90"
              viewBox="0 0 100 100"
            >
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="white"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray="282.7"
                strokeDashoffset="56.5"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold">80%</span>
              <span className="text-[10px] text-indigo-100">Weekly Goal</span>
            </div>
          </div>

          {/* Decorative blobs */}
          <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 right-1/4 w-56 h-56 rounded-full bg-violet-400/20 blur-2xl pointer-events-none" />
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
          {stats.map(({ icon: Icon, label, value, color }) => (
            <div
              key={label}
              className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3.5 hover:shadow-md transition-shadow"
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

        {/* 🧭 Discover Voice Rooms - Featured Section */}
        <section className="bg-gradient-to-r from-indigo-50 via-violet-50 to-purple-50 rounded-2xl p-5 sm:p-6 border border-indigo-200/50 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-200/50 shrink-0">
                <Compass className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-800 text-base sm:text-lg flex items-center gap-2">
                  Discover Voice Rooms
                  <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                    New
                  </span>
                </h3>
                <p className="text-sm text-slate-600">
                  Find and join live conversations from around the world
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-100/50 px-2 py-0.5 rounded-full">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${hasLiveRooms ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`}
                    />
                    {hasLiveRooms
                      ? `${liveVoiceRooms.length} rooms active`
                      : "No rooms active"}
                  </span>
                </div>
              </div>
            </div>
            <Link
              to="/discover"
              className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200/50 whitespace-nowrap w-full sm:w-auto justify-center"
            >
              Explore Now
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* 🎙️ Live Voice Rooms Section */}
        <section>
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Live Voice Rooms
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Join a conversation and practice speaking
              </p>
            </div>
            <Link
              to="/voice"
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {voiceLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm animate-pulse"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-slate-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-200 rounded w-3/4" />
                      <div className="h-3 bg-slate-100 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : hasLiveRooms ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {liveVoiceRooms.map((room) => {
                const participantCount = room.participants?.length || 0;
                const isFull = participantCount >= room.maxParticipants;
                const isAlmostFull =
                  participantCount / room.maxParticipants >= 0.8;

                return (
                  <div
                    key={room.id}
                    className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group cursor-pointer"
                    onClick={() => navigate(`/voice/${room.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative shrink-0">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-100 to-indigo-100 flex items-center justify-center">
                          <AudioLines className="w-7 h-7 text-indigo-600" />
                        </div>
                        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-800 truncate">
                            {room.name}
                          </h3>
                          {isAlmostFull && !isFull && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium whitespace-nowrap">
                              Almost full
                            </span>
                          )}
                          {isFull && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium whitespace-nowrap">
                              Full
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {participantCount}/{room.maxParticipants}
                          </span>
                          {room.type && (
                            <span className="flex items-center gap-1">
                              {room.type === "PRIVATE" ? "🔒" : "🔓"}
                              {room.type.toLowerCase()}
                            </span>
                          )}
                        </div>
                        {room.description && (
                          <p className="text-xs text-slate-400 truncate mt-0.5">
                            {room.description}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/voice/${room.id}`);
                        }}
                        disabled={isFull}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                          isFull
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                            : "bg-indigo-600 text-white hover:bg-indigo-700"
                        }`}
                      >
                        {isFull ? "Full" : "Join"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
                <AudioLines className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="font-semibold text-slate-800">
                No Live Voice Rooms
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Be the first to start a conversation!
              </p>
              <button
                onClick={() => navigate("/voice")}
                className="mt-4 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors"
              >
                Start a Room
              </button>
            </div>
          )}
        </section>

        {/* Continue Learning Section */}
        <section>
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">
              Continue Learning
            </h2>
            <Link
              to="/progress"
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              View all
            </Link>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center gap-4">
            <div className="w-full sm:w-1/2">
              <h3 className="font-semibold text-slate-800">
                Subjunctive Mood: Basics
              </h3>
              <p className="text-xs text-slate-500 mt-1">Lesson 4 of 8</p>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full"
                  style={{ width: "50%" }}
                ></div>
              </div>
            </div>
            <button
              onClick={() => navigate("/exercises")}
              className="w-full sm:w-auto sm:ml-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-semibold rounded-xl text-sm transition-colors"
            >
              <PlayCircle className="w-4 h-4" />
              Resume
            </button>
          </div>
        </section>

        {/* 🎯 Speaking Goal */}
        <section>
          <div className="bg-gradient-to-r from-amber-50 to-indigo-50 p-5 rounded-2xl border border-amber-100/50 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-200/50">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">
                    Weekly Speaking Goal
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <span className="flex items-center gap-1">
                      <AudioLines className="w-3.5 h-3.5" />
                      45/60 min
                    </span>
                    <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                      75% complete
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate("/voice")}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200/50"
              >
                Practice Now
              </button>
            </div>
            <div className="w-full bg-white/60 rounded-full h-2 mt-3">
              <div
                className="bg-gradient-to-r from-amber-400 to-indigo-600 h-2 rounded-full"
                style={{ width: "75%" }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500" />
              Practice 15 more minutes to hit your goal! 🎯
            </p>
          </div>
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
            {learningHubItems.map(({ to, title, desc, icon: Icon, color }) => {
              const c = colorMap[color];
              const isVoiceCard = to === "/voice";
              const isDiscoverCard = to === "/discover";
              const hasLive = isVoiceCard && hasLiveRooms;

              return (
                <Link
                  key={to}
                  to={to}
                  className={`group bg-white p-5 rounded-2xl border shadow-sm hover:shadow-md ${c.border} transition-all duration-200 relative overflow-hidden ${
                    hasLive
                      ? "border-amber-200 shadow-amber-100/50"
                      : "border-slate-100"
                  } ${isDiscoverCard ? "ring-1 ring-indigo-200 shadow-md shadow-indigo-100" : ""}`}
                >
                  {hasLive && (
                    <div className="absolute top-0 right-0 px-2 py-0.5 bg-red-500 text-white text-[8px] font-bold rounded-bl-lg rounded-tr-lg flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                      LIVE
                    </div>
                  )}
                  {isDiscoverCard && (
                    <div className="absolute top-0 right-0 px-2 py-0.5 bg-indigo-500 text-white text-[8px] font-bold rounded-bl-lg rounded-tr-lg flex items-center gap-1">
                      <Sparkles className="w-2 h-2" />
                      NEW
                    </div>
                  )}

                  <div
                    className={`absolute inset-0 ${c.bg} opacity-0 group-hover:opacity-10 transition-opacity`}
                  ></div>

                  <div className="relative z-10">
                    <div
                      className={`w-10 h-10 rounded-xl ${c.bg} ${c.text} flex items-center justify-center mb-4 ${c.groupHoverBg} ${c.groupHoverText} transition-colors`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors flex items-center justify-between">
                      {title}
                      <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {desc}
                    </p>
                    {hasLive && (
                      <span className="inline-block mt-2 text-[10px] font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                        {liveVoiceRooms.length} active rooms
                      </span>
                    )}
                    {isDiscoverCard && (
                      <span className="inline-block mt-2 text-[10px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Compass className="w-2.5 h-2.5" />
                        Explore now
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Recent Voice Activity */}
        <section>
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Headphones className="w-5 h-5 text-indigo-600" />
                Recent Voice Activity
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Your recent voice room sessions
              </p>
            </div>
            <Link
              to="/voice"
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              History
            </Link>
          </div>

          {voiceLoading ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 animate-pulse">
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-200 rounded w-3/4" />
                      <div className="h-3 bg-slate-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : hasLiveRooms ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="divide-y divide-slate-100">
                {liveVoiceRooms.slice(0, 3).map((room) => (
                  <div
                    key={room.id}
                    className="flex items-center gap-4 p-4 hover:bg-slate-50/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/voice/${room.id}`)}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-100 to-indigo-100 flex items-center justify-center">
                      <AudioLines className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">
                        {room.name}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {room.participants?.length || 0} participants
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {room.createdAt
                            ? formatDistanceToNow(new Date(room.createdAt), {
                                addSuffix: true,
                              })
                            : "Just now"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <span className="text-xs text-green-600 font-medium">
                        Live
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <Headphones className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">No recent voice activity</p>
              <button
                onClick={() => navigate("/voice")}
                className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Start your first voice session →
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

