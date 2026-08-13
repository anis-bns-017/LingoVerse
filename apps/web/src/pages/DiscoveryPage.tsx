import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  useDiscoverRooms,
  useRoomCategories,
  useLiveRoomsCount,
  useTrendingRooms,
  useRecommendedRooms,
} from "../hooks/useDiscovery";
import {
  Search,
  TrendingUp,
  Sparkles,
  Users,
  Globe,
  Lock,
  Clock,
  ChevronRight,
  Plus,
  Compass,
  Flame,
  Star,
  Zap,
  Crown,
  Shield,
  Headphones,
  Mic,
  Radio,
  Calendar,
  Filter,
  SlidersHorizontal,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  Check,
  Heart,
  ThumbsUp,
  MessageCircle,
  Share2,
  Bookmark,
  BookmarkCheck,
  ArrowRight,
  Music,
  Coffee,
  Gamepad2,
  BookOpen,
  Languages,
  Globe2,
  MapPin,
  Hash,
  Tag,
  UserPlus,
  Users as UsersIcon,
  Volume2,
  VolumeX,
  Crown as CrownIcon,
  Sparkle,
} from "lucide-react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

// ---- Theme Colors ----
const THEME = {
  void: "#0A0A12",
  surface: "#141425",
  surfaceRaised: "#1E1E38",
  surfaceHover: "#2A2A4A",
  border: "#2A2A4A",
  borderGlow: "rgba(120, 80, 255, 0.2)",
  aurora: {
    primary: "#7C6AFF",
    secondary: "#A78BFA",
    tertiary: "#6EE7B7",
    quaternary: "#FCD34D",
    pink: "#F472B6",
    cyan: "#67E8F9",
    purple: "#8B5CF6",
  },
  gradient: {
    from: "rgba(124, 106, 255, 0.15)",
    to: "rgba(167, 139, 250, 0.05)",
  },
  text: {
    primary: "#F8F7FF",
    secondary: "#B8B0D8",
    muted: "#7A72A0",
    accent: "#A78BFA",
  },
  status: {
    live: "#6EE7B7",
    liveGlow: "rgba(110, 231, 183, 0.3)",
    speaking: "#A78BFA",
    speakingGlow: "rgba(167, 139, 250, 0.4)",
    waiting: "#FCD34D",
    waitingGlow: "rgba(252, 211, 77, 0.3)",
  },
};

// ---- Background Particles ----
const DiscoveryParticles: React.FC = () => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const particles: {
      x: number;
      y: number;
      radius: number;
      speed: number;
      angle: number;
      opacity: number;
    }[] = [];
    const count = 50;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.3 + 0.05,
        angle: Math.random() * Math.PI * 2,
        opacity: Math.random() * 0.3 + 0.05,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed;
        p.angle += 0.005;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(167, 139, 250, ${p.opacity})`;
        ctx.fill();
      });

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 150) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(167, 139, 250, ${0.05 * (1 - distance / 150)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
};

// ---- Category Icon Map ----
const categoryIcons: Record<string, React.ElementType> = {
  "Language Learning": BookOpen,
  Conversation: UsersIcon,
  Music: Music,
  Gaming: Gamepad2,
  Study: BookOpen,
  Social: UsersIcon,
  Casual: Coffee,
  Podcast: Radio,
  Interview: Mic,
  Panel: UsersIcon,
  Default: Globe,
};

// ---- Main Component ----
export const DiscoveryPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortType, setSortType] = useState("trending");
  const [showFilters, setShowFilters] = useState(false);
  const [languageFilter, setLanguageFilter] = useState<string | null>(null);
  const [minParticipants, setMinParticipants] = useState(0);
  const [maxParticipants, setMaxParticipants] = useState(50);

  const { data: categories } = useRoomCategories();
  const { data: liveCount } = useLiveRoomsCount();
  const { data: trendingRooms } = useTrendingRooms(6);
  const { data: recommendedRooms } = useRecommendedRooms(6);
  const { data: searchResults, isLoading } = useDiscoverRooms({
    query: searchQuery,
    sort: sortType,
    category: selectedCategory || undefined,
  });

  const displayRooms =
    searchQuery || selectedCategory ? searchResults?.rooms : trendingRooms;

  // Languages (mock for filter)
  const languages = [
    "English",
    "Spanish",
    "French",
    "German",
    "Japanese",
    "Chinese",
    "Korean",
    "Portuguese",
  ];

  const sortOptions = [
    { value: "trending", label: "Trending", icon: TrendingUp },
    { value: "newest", label: "Newest", icon: Sparkles },
    { value: "popular", label: "Popular", icon: Flame },
    { value: "recommended", label: "Recommended", icon: Star },
  ];

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: THEME.void }}
    >
      <DiscoveryParticles />

      {/* Background Gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 40% at 50% 0%, ${THEME.gradient.from}, transparent 70%)`,
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Compass className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1
                  className="text-3xl font-serif font-bold"
                  style={{ color: THEME.text.primary }}
                >
                  Discover Voice Rooms
                </h1>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-sm" style={{ color: THEME.text.muted }}>
                    Find your next conversation
                  </span>
                  <span
                    className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{
                      background: "rgba(110, 231, 183, 0.15)",
                      color: THEME.status.live,
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {liveCount || 0} live now
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate("/voice")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-all hover:scale-105 active:scale-95 shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${THEME.aurora.primary}, ${THEME.aurora.secondary})`,
              color: "#fff",
              boxShadow: `0 0 30px ${THEME.aurora.primary}33`,
            }}
          >
            <Plus className="w-4 h-4" />
            Create Room
          </button>
        </div>

        {/* Search & Filters Bar */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
              style={{ color: THEME.text.muted }}
            />
            <input
              type="text"
              placeholder="Search rooms by name, topic, or language..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border outline-none text-sm transition-all focus:border-purple-500"
              style={{
                background: "rgba(20, 20, 37, 0.8)",
                backdropFilter: "blur(12px)",
                borderColor: THEME.border,
                color: THEME.text.primary,
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 transition-colors"
                style={{ color: THEME.text.muted }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-3.5 rounded-2xl border transition-all flex items-center gap-2 text-sm shrink-0"
            style={{
              background: showFilters
                ? "rgba(124, 106, 255, 0.15)"
                : "rgba(20, 20, 37, 0.8)",
              borderColor: showFilters ? THEME.aurora.primary : THEME.border,
              color: showFilters ? THEME.aurora.primary : THEME.text.secondary,
            }}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${showFilters ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-6"
            >
              <div
                className="p-5 rounded-2xl border backdrop-blur-xl"
                style={{
                  background: "rgba(20, 20, 37, 0.8)",
                  borderColor: THEME.border,
                }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Language Filter */}
                  <div>
                    <label
                      className="text-xs font-medium block mb-2"
                      style={{ color: THEME.text.secondary }}
                    >
                      Language
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {languages.map((lang) => (
                        <button
                          key={lang}
                          onClick={() =>
                            setLanguageFilter(
                              languageFilter === lang ? null : lang,
                            )
                          }
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            languageFilter === lang
                              ? "bg-purple-500 text-white"
                              : "bg-white/5 text-slate-400 hover:bg-white/10"
                          }`}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Participants Range */}
                  <div>
                    <label
                      className="text-xs font-medium block mb-2"
                      style={{ color: THEME.text.secondary }}
                    >
                      Participants ({minParticipants} - {maxParticipants})
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={minParticipants}
                        onChange={(e) =>
                          setMinParticipants(parseInt(e.target.value))
                        }
                        className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
                        style={{ background: THEME.border }}
                      />
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={maxParticipants}
                        onChange={(e) =>
                          setMaxParticipants(parseInt(e.target.value))
                        }
                        className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
                        style={{ background: THEME.border }}
                      />
                    </div>
                  </div>

                  {/* Clear Filters */}
                  <div className="flex items-end justify-end">
                    <button
                      onClick={() => {
                        setLanguageFilter(null);
                        setMinParticipants(0);
                        setMaxParticipants(50);
                        setSelectedCategory(null);
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-medium transition-all hover:bg-white/5"
                      style={{ color: THEME.text.muted }}
                    >
                      Clear All Filters
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Categories */}
        {categories && categories.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Globe2 className="w-4 h-4" style={{ color: THEME.text.muted }} />
              <span
                className="text-sm font-medium"
                style={{ color: THEME.text.secondary }}
              >
                Categories
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                  selectedCategory === null
                    ? "bg-purple-500 text-white shadow-lg shadow-purple-500/25"
                    : "bg-white/5 text-slate-400 hover:bg-white/10 border border-transparent hover:border-white/10"
                }`}
              >
                All
              </button>
              {categories.map((cat) => {
                const Icon = categoryIcons[cat.name] || categoryIcons.Default;
                return (
                  <button
                    key={cat.name}
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`px-4 py-2 rounded-full text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      selectedCategory === cat.name
                        ? "bg-purple-500 text-white shadow-lg shadow-purple-500/25"
                        : "bg-white/5 text-slate-400 hover:bg-white/10 border border-transparent hover:border-white/10"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {cat.name}
                    <span className="text-[9px] opacity-60 ml-0.5">
                      {cat.roomCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Sort Options */}
        <div className="flex items-center gap-2 mb-6">
          <span
            className="text-xs font-medium"
            style={{ color: THEME.text.muted }}
          >
            Sort by:
          </span>
          <div className="flex gap-1 bg-white/5 rounded-xl p-1">
            {sortOptions.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setSortType(value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 capitalize ${
                  sortType === value
                    ? "bg-purple-500 text-white shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Rooms Grid */}
        <LayoutGroup>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse">
                  <div
                    className="rounded-2xl p-5 h-52"
                    style={{
                      background: "rgba(20, 20, 37, 0.8)",
                      border: `1px solid ${THEME.border}`,
                    }}
                  >
                    <div
                      className="h-4 rounded w-3/4 mb-3"
                      style={{ background: THEME.border }}
                    />
                    <div
                      className="h-3 rounded w-1/2 mb-2"
                      style={{ background: THEME.border }}
                    />
                    <div
                      className="h-3 rounded w-2/3 mb-4"
                      style={{ background: THEME.border }}
                    />
                    <div className="flex gap-2">
                      <div
                        className="h-6 rounded w-16"
                        style={{ background: THEME.border }}
                      />
                      <div
                        className="h-6 rounded w-16"
                        style={{ background: THEME.border }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : displayRooms?.length > 0 ? (
            <motion.div
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {displayRooms.map((room: any, index: number) => (
                <RoomCard key={room.id} room={room} index={index} />
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "rgba(167, 139, 250, 0.1)" }}
              >
                <Compass
                  className="w-10 h-10"
                  style={{ color: THEME.aurora.primary }}
                />
              </div>
              <h3
                className="text-xl font-serif mb-2"
                style={{ color: THEME.text.primary }}
              >
                No rooms found
              </h3>
              <p style={{ color: THEME.text.muted }}>
                {searchQuery
                  ? "Try adjusting your search or filters"
                  : "Be the first to create a room!"}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => navigate("/voice")}
                  className="mt-4 px-6 py-2.5 rounded-full font-semibold text-sm transition-all hover:scale-105"
                  style={{
                    background: `linear-gradient(135deg, ${THEME.aurora.primary}, ${THEME.aurora.secondary})`,
                    color: "#fff",
                  }}
                >
                  Create a Room
                </button>
              )}
            </motion.div>
          )}
        </LayoutGroup>

        {/* Pagination */}
        {searchResults?.pagination &&
          searchResults.pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from(
                { length: Math.min(5, searchResults.pagination.totalPages) },
                (_, i) => i + 1,
              ).map((page) => (
                <button
                  key={page}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    searchResults.pagination.page === page
                      ? "bg-purple-500 text-white shadow-lg shadow-purple-500/25"
                      : "bg-white/5 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
      </div>
    </div>
  );
};

// ─── Room Card Component ──────────────────────────────────────────────

const RoomCard: React.FC<{ room: any; index: number }> = ({ room, index }) => {
  const navigate = useNavigate();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const participantCount =
    room.participantCount || room.participants?.length || 0;
  const isFull = participantCount >= room.maxParticipants;
  const isAlmostFull = participantCount / room.maxParticipants >= 0.8;
  const isNew = Date.now() - new Date(room.createdAt).getTime() < 3600000; // 1 hour

  // Get category icon
  const categoryIcon = room.category
    ? categoryIcons[room.category] || categoryIcons.Default
    : categoryIcons.Default;
  const IconComponent = categoryIcon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
      whileHover={{ y: -4, scale: 1.01 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative rounded-2xl border cursor-pointer overflow-hidden transition-all"
      style={{
        background: "rgba(20, 20, 37, 0.8)",
        backdropFilter: "blur(12px)",
        borderColor: isHovered ? THEME.aurora.primary : THEME.border,
        boxShadow: isHovered ? `0 0 30px ${THEME.aurora.primary}22` : "none",
      }}
      onClick={() => navigate(`/voice/${room.id}`)}
    >
      {/* Glow Effect on Hover */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse 50% 50% at 50% 0%, ${THEME.aurora.primary}11, transparent 70%)`,
            }}
          />
        )}
      </AnimatePresence>

      <div className="relative z-10 p-5">
        {/* Top Row */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <span
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium"
              style={{
                background: "rgba(110, 231, 183, 0.15)",
                color: THEME.status.live,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
            {isNew && (
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                style={{
                  background: "rgba(252, 211, 77, 0.15)",
                  color: THEME.status.waiting,
                }}
              >
                New
              </span>
            )}
            {isAlmostFull && !isFull && (
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                style={{
                  background: "rgba(251, 191, 36, 0.15)",
                  color: "#FBBF24",
                }}
              >
                Almost Full
              </span>
            )}
            {isFull && (
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                style={{
                  background: "rgba(239, 68, 68, 0.15)",
                  color: "#EF4444",
                }}
              >
                Full
              </span>
            )}
            {room.type === "PRIVATE" && (
              <Lock className="w-3 h-3" style={{ color: THEME.text.muted }} />
            )}
          </div>
          <div
            className="flex items-center gap-1.5 text-xs"
            style={{ color: THEME.text.muted }}
          >
            <Users className="w-3.5 h-3.5" />
            <span
              className="font-medium"
              style={{
                color:
                  participantCount > 0 ? THEME.text.primary : THEME.text.muted,
              }}
            >
              {participantCount}
            </span>
            <span className="text-[10px] opacity-50">
              / {room.maxParticipants || 50}
            </span>
          </div>
        </div>

        {/* Title & Description */}
        <div className="mb-3">
          <h3
            className="text-sm font-semibold truncate"
            style={{ color: THEME.text.primary }}
          >
            {room.name}
          </h3>
          {room.description && (
            <p
              className="text-xs line-clamp-2 mt-0.5"
              style={{ color: THEME.text.muted }}
            >
              {room.description}
            </p>
          )}
        </div>

        {/* Tags */}
        {room.tags && room.tags.length > 0 && (
          <div className="flex gap-1 mb-3 flex-wrap">
            {room.tags.slice(0, 3).map((tag: string) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full text-[9px]"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  color: THEME.text.muted,
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div
          className="flex items-center justify-between pt-3 border-t"
          style={{ borderColor: THEME.border }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {room.creator?.avatarUrl ? (
              <img
                src={room.creator.avatarUrl}
                alt=""
                className="w-6 h-6 rounded-full object-cover border-2"
                style={{ borderColor: THEME.border }}
              />
            ) : (
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{
                  background: `linear-gradient(135deg, ${THEME.aurora.primary}, ${THEME.aurora.secondary})`,
                  color: "#fff",
                }}
              >
                {room.creator?.name?.charAt(0).toUpperCase() || "U"}
              </div>
            )}
            <span
              className="text-[10px] truncate"
              style={{ color: THEME.text.muted }}
            >
              {room.creator?.name || "Unknown"}
            </span>
            {room.creator?.isHost && (
              <CrownIcon className="w-3 h-3" style={{ color: "#FBBF24" }} />
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Bookmark Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsBookmarked(!isBookmarked);
              }}
              className="p-1.5 rounded-lg transition-all hover:bg-white/5"
              style={{
                color: isBookmarked ? THEME.aurora.primary : THEME.text.muted,
              }}
            >
              {isBookmarked ? (
                <BookmarkCheck className="w-3.5 h-3.5" />
              ) : (
                <Bookmark className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/voice/${room.id}`);
              }}
              className="flex items-center gap-0.5 text-xs font-medium transition-all hover:gap-1.5 px-3 py-1.5 rounded-lg"
              style={{
                background: `linear-gradient(135deg, ${THEME.aurora.primary}, ${THEME.aurora.secondary})`,
                color: "#fff",
                opacity: isFull ? 0.5 : 1,
                cursor: isFull ? "not-allowed" : "pointer",
              }}
            >
              {isFull ? "Full" : "Join"}
              {!isFull && <ChevronRight className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Time */}
        <div
          className="flex items-center gap-1 mt-2 text-[9px]"
          style={{ color: THEME.text.muted }}
        >
          <Clock className="w-2.5 h-2.5" />
          {formatDistanceToNow(new Date(room.createdAt), { addSuffix: true })}
        </div>
      </div>
    </motion.div>
  );
};
