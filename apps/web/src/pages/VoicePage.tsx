import React, { useState } from "react";
import { useVoiceRooms, useCreateVoiceRoom, useEndVoiceRoom } from "../hooks/useVoice";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import {
  Plus,
  Mic,
  Users,
  Lock,
  Radio,
  Calendar,
  X,
  LogIn,
  Square,
  Loader2,
  AudioLines,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";

// ---- Shared theater palette (also used in StageSpeaker.tsx) ----
const COLORS = {
  void: "#0B0714",
  surface: "#1C1430",
  surfaceRaised: "#251C3E",
  border: "#322754",
  spotlight: "#F5A623",
  spotlightDim: "rgba(245, 166, 35, 0.16)",
  live: "#2DD4BF",
  liveDim: "rgba(45, 212, 191, 0.14)",
  textPrimary: "#F4EFFF",
  textMuted: "#9C90B8",
};

const TYPE_ACCENTS: Record<string, string> = {
  OPEN: "#2DD4BF",
  PRIVATE: "#F5A623",
  STAGE: "#A78BFA",
  SCHEDULED: "#38BDF8",
};

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join("") || "?"
  );
}

function hueFromString(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
}

export const VoicePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: rooms, isLoading } = useVoiceRooms();
  const createRoom = useCreateVoiceRoom();
  const endRoom = useEndVoiceRoom();

  const [showCreate, setShowCreate] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "OPEN",
    maxParticipants: 50,
    password: "",
  });

  const [joinTarget, setJoinTarget] = useState<{ id: string; name: string } | null>(null);
  const [joinPassword, setJoinPassword] = useState("");
  const [joinError, setJoinError] = useState("");
  const [showJoinPassword, setShowJoinPassword] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.type === "PRIVATE" && formData.password.trim().length < 4) {
      toast.error("Private rooms need a password of at least 4 characters");
      return;
    }

    try {
      const payload: any = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        maxParticipants: formData.maxParticipants,
      };
      if (formData.type === "PRIVATE") payload.password = formData.password;

      const newRoom = await createRoom.mutateAsync(payload);
      toast.success("Room created");
      setShowCreate(false);
      setFormData({ name: "", description: "", type: "OPEN", maxParticipants: 50, password: "" });
      navigate(`/voice/${newRoom.id}`);
    } catch {
      // handled by mutation
    }
  };

  const handleJoin = (room: any) => {
    const isCreator = room.creatorId === user?.id;
    if (room.type === "PRIVATE" && !isCreator) {
      setJoinTarget({ id: room.id, name: room.name });
      setJoinPassword("");
      setJoinError("");
      return;
    }
    navigate(`/voice/${room.id}`);
  };

  const handleConfirmJoinWithPassword = () => {
    if (!joinTarget) return;
    if (!joinPassword.trim()) {
      setJoinError("Password is required");
      return;
    }
    navigate(`/voice/${joinTarget.id}`, { state: { password: joinPassword } });
    setJoinTarget(null);
    setJoinPassword("");
    setJoinError("");
  };

  const handleEnd = async (roomId: string) => {
    if (window.confirm("End this room for everyone?")) {
      await endRoom.mutateAsync(roomId);
      toast.success("Room ended");
    }
  };

  const typeConfig: Record<string, { label: string; icon: React.ElementType }> = {
    OPEN: { label: "Open", icon: Users },
    PRIVATE: { label: "Private", icon: Lock },
    STAGE: { label: "Stage", icon: Radio },
    SCHEDULED: { label: "Scheduled", icon: Calendar },
  };

  return (
    <div className="min-h-screen font-sans" style={{ background: COLORS.void }}>
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-10">
          <div>
            <span
              className="text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 rounded-full"
              style={{ background: COLORS.spotlightDim, color: COLORS.spotlight }}
            >
              Now Playing
            </span>
            <h1
              className="font-serif text-3xl sm:text-4xl mt-2"
              style={{ color: COLORS.textPrimary }}
            >
              Voice Rooms
            </h1>
            <p className="text-sm mt-1.5" style={{ color: COLORS.textMuted }}>
              Live conversations, open doors. Step in and speak.
            </p>
          </div>

          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full font-semibold text-sm shrink-0 transition-transform hover:scale-105"
            style={{ background: COLORS.spotlight, color: COLORS.void }}
          >
            <Plus className="w-4 h-4" />
            Create Room
          </button>
        </div>

        {/* Create Room Form */}
        {showCreate && (
          <div
            className="mb-10 rounded-2xl border overflow-hidden"
            style={{ background: COLORS.surface, borderColor: COLORS.border }}
          >
            <div
              className="flex items-center justify-between px-6 py-4 border-b"
              style={{ borderColor: COLORS.border }}
            >
              <h2 className="font-serif text-lg" style={{ color: COLORS.textPrimary }}>
                Set the stage
              </h2>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: COLORS.textMuted }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: COLORS.textPrimary }}
                  >
                    Room name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Spanish Conversation Practice"
                    required
                    className="w-full px-4 py-2.5 rounded-xl border outline-none text-sm transition-colors"
                    style={{
                      background: COLORS.surfaceRaised,
                      borderColor: COLORS.border,
                      color: COLORS.textPrimary,
                    }}
                  />
                </div>

                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: COLORS.textPrimary }}
                  >
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as any, password: "" })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border outline-none text-sm"
                    style={{
                      background: COLORS.surfaceRaised,
                      borderColor: COLORS.border,
                      color: COLORS.textPrimary,
                    }}
                  >
                    <option value="OPEN">Open</option>
                    <option value="PRIVATE">Private</option>
                    <option value="STAGE">Stage</option>
                    <option value="SCHEDULED">Scheduled</option>
                  </select>
                </div>

                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: COLORS.textPrimary }}
                  >
                    Max participants
                  </label>
                  <input
                    type="number"
                    value={formData.maxParticipants}
                    onChange={(e) =>
                      setFormData({ ...formData, maxParticipants: parseInt(e.target.value) || 50 })
                    }
                    min={2}
                    max={100}
                    className="w-full px-4 py-2.5 rounded-xl border outline-none text-sm"
                    style={{
                      background: COLORS.surfaceRaised,
                      borderColor: COLORS.border,
                      color: COLORS.textPrimary,
                    }}
                  />
                </div>

                {formData.type === "PRIVATE" && (
                  <div className="sm:col-span-2">
                    <label
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: COLORS.textPrimary }}
                    >
                      Room password
                    </label>
                    <div className="relative">
                      <KeyRound
                        className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2"
                        style={{ color: COLORS.textMuted }}
                      />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="At least 4 characters"
                        minLength={4}
                        required
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border outline-none text-sm"
                        style={{
                          background: COLORS.surfaceRaised,
                          borderColor: COLORS.border,
                          color: COLORS.textPrimary,
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        style={{ color: COLORS.textMuted }}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs mt-1.5" style={{ color: COLORS.textMuted }}>
                      Anyone joining will need this password.
                    </p>
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: COLORS.textPrimary }}
                  >
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="What will this room be about?"
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl border outline-none text-sm resize-none"
                    style={{
                      background: COLORS.surfaceRaised,
                      borderColor: COLORS.border,
                      color: COLORS.textPrimary,
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-5 py-2.5 text-sm font-medium rounded-xl transition-colors"
                  style={{ color: COLORS.textMuted }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createRoom.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm disabled:opacity-60"
                  style={{ background: COLORS.spotlight, color: COLORS.void }}
                >
                  {createRoom.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating…
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      Create room
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-2xl border p-5 animate-pulse"
                style={{ background: COLORS.surface, borderColor: COLORS.border }}
              >
                <div className="h-5 rounded-lg w-1/3 mb-3" style={{ background: COLORS.surfaceRaised }} />
                <div className="h-4 rounded-lg w-2/3" style={{ background: COLORS.surfaceRaised }} />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && (!rooms || rooms.length === 0) && (
          <div
            className="rounded-2xl border py-16 px-6 text-center"
            style={{ background: COLORS.surface, borderColor: COLORS.border }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: COLORS.spotlightDim, color: COLORS.spotlight }}
            >
              <AudioLines className="w-8 h-8" />
            </div>
            <h3 className="font-serif text-lg mb-2" style={{ color: COLORS.textPrimary }}>
              The stage is quiet
            </h3>
            <p className="text-sm max-w-sm mx-auto mb-6" style={{ color: COLORS.textMuted }}>
              Be the first to open a room and start practicing speaking with other learners.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm"
              style={{ background: COLORS.spotlight, color: COLORS.void }}
            >
              <Plus className="w-4 h-4" />
              Create your first room
            </button>
          </div>
        )}

        {/* Room list — ticket stubs */}
        {!isLoading && rooms && rooms.length > 0 && (
          <div className="space-y-4">
            {rooms.map((room) => {
              const type = typeConfig[room.type] || typeConfig.OPEN;
              const TypeIcon = type.icon;
              const accent = TYPE_ACCENTS[room.type] || TYPE_ACCENTS.OPEN;
              const isEnded = room.status === "ENDED";
              const isCreator = room.creatorId === user?.id;
              const previewParticipants = (room.participants || []).slice(0, 4);

              return (
                <div
                  key={room.id}
                  className="flex rounded-2xl border overflow-hidden transition-opacity"
                  style={{
                    background: COLORS.surface,
                    borderColor: COLORS.border,
                    opacity: isEnded ? 0.5 : 1,
                  }}
                >
                  <div className="w-1.5 shrink-0" style={{ background: accent }} />

                  <div
                    className="w-px shrink-0 my-3"
                    style={{
                      backgroundImage: `repeating-linear-gradient(to bottom, ${COLORS.border} 0, ${COLORS.border} 4px, transparent 4px, transparent 9px)`,
                    }}
                  />

                  <div className="flex-1 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <h3
                          className="font-serif text-lg truncate"
                          style={{ color: COLORS.textPrimary }}
                        >
                          {room.name}
                        </h3>
                        {!isEnded && (
                          <span className="relative flex h-2 w-2 shrink-0">
                            <span
                              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                              style={{ background: accent }}
                            />
                            <span
                              className="relative inline-flex rounded-full h-2 w-2"
                              style={{ background: accent }}
                            />
                          </span>
                        )}
                      </div>

                      {room.description && (
                        <p
                          className="text-sm mb-3 line-clamp-2"
                          style={{ color: COLORS.textMuted }}
                        >
                          {room.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full"
                          style={{ background: `${accent}22`, color: accent }}
                        >
                          <TypeIcon className="w-3 h-3" />
                          {type.label}
                        </span>

                        {previewParticipants.length > 0 && (
                          <div className="flex items-center -space-x-2">
                            {previewParticipants.map((p: any) => {
                              const hue = hueFromString(p.user?.name || "?");
                              return (
                                <div
                                  key={p.id}
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold border-2"
                                  style={{
                                    background: `hsl(${hue}, 35%, 24%)`,
                                    borderColor: COLORS.surface,
                                    color: COLORS.textPrimary,
                                  }}
                                >
                                  {initials(p.user?.name || "?")}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <span className="text-xs font-mono" style={{ color: COLORS.textMuted }}>
                          {room.participants?.length || 0}/{room.maxParticipants || 50}
                        </span>

                        <span className="text-xs capitalize" style={{ color: COLORS.textMuted }}>
                          {room.status?.toLowerCase()}
                        </span>
                      </div>
                    </div>

                    {!isEnded && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleJoin(room)}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold text-sm transition-transform hover:scale-105"
                          style={{ background: accent, color: COLORS.void }}
                        >
                          {room.type === "PRIVATE" && !isCreator ? (
                            <Lock className="w-4 h-4" />
                          ) : (
                            <LogIn className="w-4 h-4" />
                          )}
                          Join
                        </button>

                        {isCreator && (
                          <button
                            onClick={() => handleEnd(room.id)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium border transition-colors"
                            style={{ borderColor: COLORS.border, color: COLORS.textMuted }}
                          >
                            <Square className="w-3.5 h-3.5" />
                            End
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Join password modal */}
      {joinTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div
            className="rounded-2xl w-full max-w-sm p-6 border"
            style={{ background: COLORS.surface, borderColor: COLORS.border }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: COLORS.spotlightDim, color: COLORS.spotlight }}
              >
                <Lock className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-serif truncate" style={{ color: COLORS.textPrimary }}>
                  {joinTarget.name}
                </h3>
                <p className="text-xs" style={{ color: COLORS.textMuted }}>
                  This room is password-protected
                </p>
              </div>
            </div>

            <label className="block text-sm font-medium mb-1.5" style={{ color: COLORS.textPrimary }}>
              Password
            </label>
            <div className="relative mb-1.5">
              <KeyRound
                className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2"
                style={{ color: COLORS.textMuted }}
              />
              <input
                type={showJoinPassword ? "text" : "password"}
                value={joinPassword}
                onChange={(e) => {
                  setJoinPassword(e.target.value);
                  if (joinError) setJoinError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleConfirmJoinWithPassword()}
                placeholder="Enter room password"
                autoFocus
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border outline-none text-sm"
                style={{
                  background: COLORS.surfaceRaised,
                  borderColor: joinError ? "#F87171" : COLORS.border,
                  color: COLORS.textPrimary,
                }}
              />
              <button
                type="button"
                onClick={() => setShowJoinPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: COLORS.textMuted }}
              >
                {showJoinPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {joinError && <p className="text-xs mb-3" style={{ color: "#F87171" }}>{joinError}</p>}
            {!joinError && <div className="mb-3" />}

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                onClick={() => setJoinTarget(null)}
                className="px-4 py-2.5 text-sm font-medium rounded-xl"
                style={{ color: COLORS.textMuted }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmJoinWithPassword}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm"
                style={{ background: COLORS.spotlight, color: COLORS.void }}
              >
                <LogIn className="w-4 h-4" />
                Join room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};