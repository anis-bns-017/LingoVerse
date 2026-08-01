import React, { useState, useRef, useEffect } from 'react';
import { Send, Image, Paperclip, Smile, X, Loader2 } from 'lucide-react';

interface MessageInputProps {
  onSend: (content: string, type?: string, mediaUrl?: string, fileUrl?: string) => void;
  onTyping?: (isTyping: boolean) => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({ onSend, onTyping }) => {
  const [content, setContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [fileAttachment, setFileAttachment] = useState<{ name: string; url: string } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Use refs for typing states to prevent stale closure bugs in setTimeout
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea height as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  }, [content]);

  const stopTyping = () => {
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onTyping?.(false);
    }
  };

  const handleSend = () => {
    if (!content.trim() && !mediaPreview && !fileAttachment) return;

    let messageType = 'TEXT';
    if (mediaPreview) messageType = 'IMAGE';
    else if (fileAttachment) messageType = 'FILE';

    onSend(content.trim(), messageType, mediaPreview || undefined, fileAttachment?.url);

    // Reset Form
    setContent('');
    setMediaPreview(null);
    setFileAttachment(null);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    stopTyping();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);

    if (val.trim().length > 0) {
      if (!isTypingRef.current) {
        isTypingRef.current = true;
        onTyping?.(true);
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, 2000);
    } else {
      stopTyping();
    }
  };

  // Mock Upload Handler (replace with your Cloudinary/storage logic)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isImage: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    // Simulating file upload preview
    const reader = new FileReader();
    reader.onloadend = () => {
      if (isImage) {
        setMediaPreview(reader.result as string);
      } else {
        setFileAttachment({ name: file.name, url: reader.result as string });
      }
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  return (
    <div className="space-y-2">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={imageInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileUpload(e, true)}
      />
      <input
        type="file"
        ref={fileInputRef}
        accept=".pdf,.doc,.docx,.zip,.txt"
        className="hidden"
        onChange={(e) => handleFileUpload(e, false)}
      />

      {/* Attachment Preview Bar */}
      {(mediaPreview || fileAttachment || isUploading) && (
        <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200/80 rounded-2xl">
          {isUploading ? (
            <div className="flex items-center gap-2 text-xs text-indigo-600 font-semibold px-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Uploading attachment...</span>
            </div>
          ) : (
            <>
              {mediaPreview && (
                <div className="relative group">
                  <img
                    src={mediaPreview}
                    alt="upload preview"
                    className="w-14 h-14 object-cover rounded-xl border border-slate-200"
                  />
                  <button
                    onClick={() => setMediaPreview(null)}
                    className="absolute -top-1.5 -right-1.5 bg-slate-900 text-white p-0.5 rounded-full hover:bg-rose-600 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {fileAttachment && (
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
                  <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="truncate max-w-[180px]">{fileAttachment.name}</span>
                  <button
                    onClick={() => setFileAttachment(null)}
                    className="text-slate-400 hover:text-rose-600 transition-colors ml-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Main Input Control Bar */}
      <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 p-2 rounded-2xl transition-all">
        {/* Attachment Buttons */}
        <div className="flex items-center gap-1 pb-1">
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-200/60 rounded-xl transition-colors"
            title="Attach Image"
          >
            <Image className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-200/60 rounded-xl transition-colors"
            title="Attach Document"
          >
            <Paperclip className="w-4 h-4" />
          </button>
        </div>

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Shift + Enter for line break)"
          rows={1}
          className="flex-1 bg-transparent py-1.5 px-1 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none resize-none max-h-32 custom-scrollbar"
        />

        {/* Right Actions */}
        <div className="flex items-center gap-1 pb-1">
          <button
            type="button"
            onClick={() => setContent((prev) => prev + ' 😊')}
            className="p-2 text-slate-400 hover:text-amber-500 hover:bg-slate-200/60 rounded-xl transition-colors hidden sm:block"
            title="Add Emoji"
          >
            <Smile className="w-4 h-4" />
          </button>

          <button
            onClick={handleSend}
            disabled={(!content.trim() && !mediaPreview && !fileAttachment) || isUploading}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 disabled:active:scale-100 text-white rounded-xl transition-all shadow-xs shrink-0"
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};