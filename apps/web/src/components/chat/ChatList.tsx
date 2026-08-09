import React, { useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import type { Chat } from "../../hooks/useChat";
import {
  Users,
  User,
  Image as ImageIcon,
  Mic,
  FileText,
  Sticker,
  MapPin,
  Pin,
  BellOff,
} from "lucide-react";

interface ChatListProps {
  chats: Chat[];
  selectedChatId?: string;
  onSelectChat: (chatId: string) => void;
  onlineUserIds?: Set<string>;
}

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const MEDIA_PREVIEW: Record<
  string,
  { icon: React.ElementType; label: string }
> = {
  IMAGE: { icon: ImageIcon, label: "Photo" },
  VIDEO: { icon: ImageIcon, label: "Video" },
  AUDIO: { icon: Mic, label: "Audio" },
  VOICE_NOTE: { icon: Mic, label: "Voice note" },
  FILE: { icon: FileText, label: "File" },
  GIF: { icon: ImageIcon, label: "GIF" },
  STICKER: { icon: Sticker, label: "Sticker" },
  LOCATION: { icon: MapPin, label: "Location" },
};

export const ChatList: React.FC<ChatListProps> = ({
  chats,
  selectedChatId,
  onSelectChat,
  onlineUserIds,
}) => {
  const { user } = useAuth();

  const getOtherParticipant = (chat: Chat) => {
    return chat.participants?.find((p) => p.userId !== user?.id)?.user;
  };

  const getMyParticipant = (chat: Chat) => {
    return chat.participants?.find((p) => p.userId === user?.id);
  };

  const getChatName = (chat: Chat) => {
    if (chat.type === "PRIVATE") {
      const otherUser = getOtherParticipant(chat);
      return otherUser?.name || "Unknown User";
    }
    return chat.name || "Group Chat";
  };

  const getChatAvatar = (chat: Chat) => {
    if (chat.type === "PRIVATE") {
      const otherUser = getOtherParticipant(chat);
      return otherUser?.avatarUrl;
    }
    return chat.avatarUrl;
  };

  const isOnline = (chat: Chat) => {
    if (chat.type !== "PRIVATE" || !onlineUserIds) return false;
    const other = getOtherParticipant(chat);
    return other ? onlineUserIds.has(other.id) : false;
  };

  const isUnread = (chat: Chat) => {
    if (chat.unreadCount && chat.unreadCount > 0) return true;
    const lastMsg = chat.messages?.[0];
    if (!lastMsg || lastMsg.senderId === user?.id) return false;
    const me = getMyParticipant(chat);
    if (!me?.lastReadAt) return true;
    return new Date(lastMsg.createdAt) > new Date(me.lastReadAt);
  };

  const renderLastMessage = (chat: Chat) => {
    const msg = chat.messages?.[0];
    if (!msg) return <span className="italic">No messages yet</span>;
    if (msg.isDeleted) return <span className="italic">Message deleted</span>;

    const prefix =
      chat.type !== "PRIVATE" && msg.senderId !== user?.id
        ? `${msg.sender?.name?.split(" ")[0] || "Someone"}: `
        : msg.senderId === user?.id
          ? "You: "
          : "";

    if (msg.content) {
      return (
        <>
          {prefix}
          {msg.content}
        </>
      );
    }

    const media = MEDIA_PREVIEW[msg.type] || MEDIA_PREVIEW.FILE;
    const Icon = media.icon;
    return (
      <span className="inline-flex items-center gap-1">
        {prefix}
        <Icon className="w-3 h-3 shrink-0" />
        {media.label}
      </span>
    );
  };

  // Sort only (filtering is already done in ChatPage)
  const sortedChats = useMemo(() => {
    return [...chats].sort((a, b) => {
      const aPinned = getMyParticipant(a)?.isPinned ? 1 : 0;
      const bPinned = getMyParticipant(b)?.isPinned ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chats, user?.id]);

  return (
    <div className="flex-1 p-3 pt-1 space-y-1.5 overflow-y-auto custom-scrollbar">
      {sortedChats.length === 0 ? (
        <div className="text-center py-10 text-xs text-slate-400">
          <p>No conversations yet</p>
        </div>
      ) : (
        sortedChats.map((chat) => {
          const isSelected = selectedChatId === chat.id;
          const avatarUrl = getChatAvatar(chat);
          const name = getChatName(chat);
          const isGroup = chat.type !== "PRIVATE";
          const online = isOnline(chat);
          const unread = isUnread(chat);
          const me = getMyParticipant(chat);
          const lastMsg = chat.messages?.[0];

          return (
            <div
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={`group relative p-3 rounded-2xl cursor-pointer transition-all flex items-center gap-3.5 border ${
                isSelected
                  ? "bg-indigo-50/70 border-indigo-100 shadow-sm"
                  : "bg-white hover:bg-slate-50 border-transparent hover:border-slate-100"
              }`}
            >
              {isSelected && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-600 rounded-r-full" />
              )}

              {/* Avatar */}
              <div className="relative shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={name}
                    className="w-12 h-12 rounded-2xl object-cover border border-slate-100"
                  />
                ) : (
                  <div
                    className={`w-12 h-12 rounded-2xl font-bold text-base flex items-center justify-center border transition-all ${
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 border-slate-200/60"
                    }`}
                  >
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}

                <div
                  className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-lg flex items-center justify-center text-[10px] border shadow-xs ${
                    isGroup
                      ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                      : "bg-white text-slate-500 border-slate-100"
                  }`}
                >
                  {isGroup ? (
                    <Users className="w-3 h-3" />
                  ) : (
                    <User className="w-3 h-3" />
                  )}
                </div>

                {online && (
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                )}
              </div>

              {/* Text metadata */}
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 min-w-0">
                    {me?.isPinned && (
                      <Pin className="w-3 h-3 text-indigo-400 shrink-0" />
                    )}
                    <h4
                      className={`font-bold text-xs truncate transition-colors ${
                        isSelected ? "text-indigo-950" : "text-slate-800"
                      }`}
                    >
                      {name}
                    </h4>
                    {me?.isMuted && (
                      <BellOff className="w-3 h-3 text-slate-300 shrink-0" />
                    )}
                  </div>
                  {lastMsg && (
                    <span
                      className={`text-[10px] shrink-0 ${
                        unread
                          ? "text-indigo-600 font-semibold"
                          : "text-slate-400"
                      }`}
                    >
                      {formatRelativeTime(lastMsg.createdAt)}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div
                    className={`text-xs truncate flex-1 transition-colors ${
                      unread
                        ? "text-slate-700 font-medium"
                        : isSelected
                          ? "text-indigo-700/80 font-medium"
                          : "text-slate-400"
                    }`}
                  >
                    {renderLastMessage(chat)}
                  </div>

                  {unread && (
                    <div className="shrink-0 flex items-center justify-center">
                      {chat.unreadCount && chat.unreadCount > 0 ? (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold text-white bg-indigo-600 rounded-full min-w-[1.25rem] text-center leading-none">
                          {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                        </span>
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-indigo-600" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
