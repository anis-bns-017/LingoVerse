import React, { useState } from 'react';
import { useVoiceRoom, useAddToStage, useRemoveFromStage, useVoiceSocket } from '../../hooks/useVoice';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { Hand, Crown, Mic, MicOff, X, UserPlus, ArrowLeft, Users } from 'lucide-react';

interface StageSpeakerProps {
  roomId: string;
  onLeave?: () => void;
}

// ---- Theater palette (applied via inline style since no Tailwind arbitrary values) ----
const COLORS = {
  void: '#0B0714',
  surface: '#1C1430',
  surfaceRaised: '#251C3E',
  border: '#322754',
  spotlight: '#F5A623',
  spotlightDim: 'rgba(245, 166, 35, 0.18)',
  live: '#2DD4BF',
  liveDim: 'rgba(45, 212, 191, 0.16)',
  textPrimary: '#F4EFFF',
  textMuted: '#9C90B8',
};

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('') || '?';
}

function hueFromString(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
}

export const StageSpeaker: React.FC<StageSpeakerProps> = ({ roomId, onLeave }) => {
  const { user } = useAuth();
  const { data: room, isLoading, refetch } = useVoiceRoom(roomId);
  const { socket } = useVoiceSocket(roomId, user?.id || '');
  const addToStage = useAddToStage();
  const removeFromStage = useRemoveFromStage();

  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center font-sans"
        style={{ background: COLORS.void, color: COLORS.textMuted }}
      >
        <div className="text-center">
          <div
            className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-3"
            style={{ borderColor: COLORS.spotlight, borderTopColor: 'transparent' }}
          />
          Raising the curtain…
        </div>
      </div>
    );
  }

  if (!room || room.type !== 'STAGE') {
    return (
      <div
        className="min-h-screen flex items-center justify-center font-sans px-6"
        style={{ background: COLORS.void, color: COLORS.textMuted }}
      >
        <div className="text-center max-w-sm">
          <p className="font-serif text-xl mb-2" style={{ color: COLORS.textPrimary }}>
            No stage here
          </p>
          <p className="text-sm">This room isn't set up as a stage.</p>
        </div>
      </div>
    );
  }

  const stage = room.stages[0];
  if (!stage) {
    return (
      <div
        className="min-h-screen flex items-center justify-center font-sans px-6"
        style={{ background: COLORS.void, color: COLORS.textMuted }}
      >
        <p>The stage hasn't been built yet.</p>
      </div>
    );
  }

  const speakers = stage.speakers || [];
  const listeners = room.participants.filter((p) => p.role === 'LISTENER');
  const isSpeaker = speakers.includes(user?.id || '');
  const isModerator = room.participants.some(
    (p) => p.userId === user?.id && (p.role === 'MODERATOR' || p.userId === room.creatorId),
  );
  const isFull = speakers.length >= 5;
  const raisedHandCount = listeners.filter((l) => l.raisedHand).length;

  const handleAddToStage = async (userId: string) => {
    if (isFull) {
      toast.error('The stage is full — 5 speakers max');
      return;
    }
    setPendingUserId(userId);
    try {
      await addToStage.mutateAsync({ roomId, userId });
      toast.success('Invited to the stage');
      refetch();
    } catch {
      toast.error("Couldn't add them to the stage");
    } finally {
      setPendingUserId(null);
    }
  };

  const handleRemoveFromStage = async (userId: string) => {
    setPendingUserId(userId);
    try {
      await removeFromStage.mutateAsync({ roomId, userId });
      toast.success('Stepped off the stage');
      refetch();
    } catch {
      toast.error("Couldn't remove them from the stage");
    } finally {
      setPendingUserId(null);
    }
  };

  const handleRaiseHand = () => {
    socket?.emit('voice:raise-hand', { roomId, raise: true });
    toast.success("Hand raised — you're in the queue");
  };

  const handleLowerHand = () => {
    socket?.emit('voice:raise-hand', { roomId, raise: false });
    toast.success('Hand lowered');
  };

  return (
    <div className="min-h-screen font-sans flex flex-col" style={{ background: COLORS.void }}>
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: COLORS.border }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {onLeave && (
            <button
              onClick={onLeave}
              className="p-2 rounded-full transition-colors shrink-0"
              style={{ color: COLORS.textMuted }}
              onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.surface)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 rounded-full"
                style={{ background: COLORS.spotlightDim, color: COLORS.spotlight }}
              >
                Live Stage
              </span>
            </div>
            <h2
              className="font-serif text-lg truncate mt-0.5"
              style={{ color: COLORS.textPrimary }}
            >
              {stage.name || 'Main Stage'}
            </h2>
          </div>
        </div>

        <div
          className="font-mono text-xs shrink-0 flex items-center gap-1.5"
          style={{ color: COLORS.textMuted }}
        >
          <span style={{ color: COLORS.spotlight }}>{speakers.length}</span>
          <span>/</span>
          <span>5</span>
          <span className="ml-1">speaking</span>
        </div>
      </div>

      {/* The stage */}
      <div
        className="relative px-6 pt-14 pb-16 overflow-hidden"
        style={{
          backgroundImage: `radial-gradient(ellipse 80% 60% at 50% 0%, ${COLORS.spotlightDim}, transparent 70%)`,
        }}
      >
        {speakers.length === 0 ? (
          <div className="text-center py-10">
            <p className="font-serif text-lg" style={{ color: COLORS.textMuted }}>
              The stage is empty
            </p>
            <p className="text-xs mt-1" style={{ color: COLORS.textMuted }}>
              {isModerator ? 'Invite a listener up when you\'re ready.' : 'Waiting for a speaker to step up.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center items-start gap-8">
            {speakers.map((userId) => {
              const participant = room.participants.find((p) => p.userId === userId);
              if (!participant) return null;
              const live = !participant.isMuted;
              const hue = hueFromString(participant.user.name);

              return (
                <div key={userId} className="flex flex-col items-center w-24">
                  <div className="relative">
                    {live && (
                      <span
                        className="absolute inset-0 rounded-full animate-ping"
                        style={{ border: `2px solid ${COLORS.spotlight}`, opacity: 0.5 }}
                      />
                    )}
                    <div
                      className="relative w-16 h-16 rounded-full flex items-center justify-center font-serif text-lg font-semibold border-2"
                      style={{
                        background: `hsl(${hue}, 40%, 22%)`,
                        borderColor: live ? COLORS.spotlight : COLORS.border,
                        color: COLORS.textPrimary,
                        boxShadow: live ? `0 0 20px ${COLORS.spotlightDim}` : 'none',
                      }}
                    >
                      {initials(participant.user.name)}
                    </div>
                    {participant.userId === room.creatorId && (
                      <div
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: COLORS.spotlight }}
                      >
                        <Crown className="w-3 h-3" style={{ color: COLORS.void }} />
                      </div>
                    )}
                  </div>

                  <span
                    className="text-sm font-medium mt-2 truncate w-full text-center"
                    style={{ color: COLORS.textPrimary }}
                  >
                    {participant.user.name}
                  </span>

                  <div className="flex items-center gap-1 mt-0.5">
                    {live ? (
                      <Mic className="w-3 h-3" style={{ color: COLORS.live }} />
                    ) : (
                      <MicOff className="w-3 h-3" style={{ color: COLORS.textMuted }} />
                    )}
                    <span className="text-[11px]" style={{ color: COLORS.textMuted }}>
                      {live ? 'live' : 'muted'}
                    </span>
                  </div>

                  {(isModerator || userId === user?.id) && (
                    <button
                      onClick={() => handleRemoveFromStage(userId)}
                      disabled={pendingUserId === userId}
                      className="mt-2 text-[11px] px-2 py-1 rounded-full border transition-colors disabled:opacity-50"
                      style={{ borderColor: COLORS.border, color: COLORS.textMuted }}
                    >
                      Step off
                    </button>
                  )}
                </div>
              );
            })}

            {isFull && (
              <div
                className="flex flex-col items-center justify-center w-24 h-16 rounded-full border border-dashed text-[11px] text-center px-2"
                style={{ borderColor: COLORS.border, color: COLORS.textMuted }}
              >
                Stage full
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edge of stage */}
      <div className="relative px-6">
        <div
          className="h-px w-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${COLORS.spotlight}, transparent)`,
            opacity: 0.4,
          }}
        />
      </div>

      {/* Audience */}
      <div className="flex-1 px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" style={{ color: COLORS.textMuted }} />
            <h4 className="font-serif text-base" style={{ color: COLORS.textPrimary }}>
              The Audience
            </h4>
            <span className="font-mono text-xs" style={{ color: COLORS.textMuted }}>
              ({listeners.length})
            </span>
          </div>
          {raisedHandCount > 0 && (
            <span
              className="text-[11px] font-mono px-2 py-1 rounded-full flex items-center gap-1"
              style={{ background: COLORS.liveDim, color: COLORS.live }}
            >
              <Hand className="w-3 h-3" />
              {raisedHandCount} waiting
            </span>
          )}
        </div>

        {listeners.length === 0 ? (
          <p className="text-sm" style={{ color: COLORS.textMuted }}>
            No one in the audience yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {listeners.map((participant) => {
              const hue = hueFromString(participant.user.name);
              return (
                <div
                  key={participant.id}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border"
                  style={{
                    background: participant.raisedHand ? COLORS.liveDim : COLORS.surface,
                    borderColor: participant.raisedHand ? COLORS.live : COLORS.border,
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                    style={{ background: `hsl(${hue}, 35%, 24%)`, color: COLORS.textPrimary }}
                  >
                    {initials(participant.user.name)}
                  </div>
                  <span
                    className="text-sm font-medium truncate flex-1"
                    style={{ color: COLORS.textPrimary }}
                  >
                    {participant.user.name}
                  </span>
                  {participant.raisedHand && (
                    <Hand className="w-3.5 h-3.5 shrink-0" style={{ color: COLORS.live }} />
                  )}
                  {isModerator && !participant.raisedHand && (
                    <button
                      onClick={() => handleAddToStage(participant.userId)}
                      disabled={isFull || pendingUserId === participant.userId}
                      className="shrink-0 p-1 rounded-full transition-colors disabled:opacity-40"
                      style={{ color: COLORS.spotlight }}
                      title="Invite to stage"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {isModerator && participant.raisedHand && (
                    <button
                      onClick={() => handleAddToStage(participant.userId)}
                      disabled={isFull || pendingUserId === participant.userId}
                      className="shrink-0 text-[11px] font-mono px-2 py-1 rounded-full disabled:opacity-40"
                      style={{ background: COLORS.spotlight, color: COLORS.void }}
                    >
                      Bring up
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky action bar */}
      <div
        className="sticky bottom-0 px-6 py-4 border-t flex justify-center"
        style={{ background: COLORS.surfaceRaised, borderColor: COLORS.border }}
      >
        {!isSpeaker && (
          <button
            onClick={handleRaiseHand}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm transition-transform hover:scale-105"
            style={{ background: COLORS.spotlight, color: COLORS.void }}
          >
            <Hand className="w-4 h-4" />
            Raise Hand
          </button>
        )}
        {isSpeaker && (
          <button
            onClick={handleLowerHand}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm border transition-colors"
            style={{ borderColor: COLORS.border, color: COLORS.textPrimary }}
          >
            <X className="w-4 h-4" />
            Lower Hand
          </button>
        )}
      </div>
    </div>
  );
};