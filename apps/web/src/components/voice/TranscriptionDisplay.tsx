// apps/web/src/components/voice/TranscriptionDisplay.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Select } from '../ui/Select';
import { ScrollArea } from '../ui/ScrollArea';
import { 
  Mic, 
  MicOff, 
  Languages, 
  Copy, 
  Check,
  Download,
  Loader2,
} from 'lucide-react';

interface Transcription {
  id: string;
  text: string;
  isFinal: boolean;
  speaker: string;
  userId: string;
  user?: {
    id: string;
    name: string;
    avatarUrl: string;
  };
  confidence?: number;
  timestamp: Date;
  translated?: {
    text: string;
    language: string;
  };
}

interface TranscriptionDisplayProps {
  transcriptions: Transcription[];
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onTranslate: (transcriptionId: string, targetLanguage: string) => Promise<void>;
  className?: string;
}

const SUPPORTED_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ar', label: 'Arabic' },
  { value: 'hi', label: 'Hindi' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ru', label: 'Russian' },
  { value: 'it', label: 'Italian' },
];

export const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({
  transcriptions,
  isRecording,
  onStartRecording,
  onStopRecording,
  onTranslate,
  className = '',
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom when new transcriptions arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcriptions, autoScroll]);

  const handleTranslate = async (transcriptionId: string) => {
    setTranslatingId(transcriptionId);
    try {
      await onTranslate(transcriptionId, selectedLanguage);
    } catch (error) {
      console.error('Translation failed:', error);
    } finally {
      setTranslatingId(null);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = () => {
    const text = transcriptions
      .filter(t => t.isFinal)
      .map(t => `[${t.timestamp.toLocaleTimeString()}] ${t.speaker}: ${t.text}`)
      .join('\n');
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcription-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className={`bg-gray-800 border border-gray-700 ${className}`}>
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-white font-semibold">Live Transcription</h3>
          <Badge variant={isRecording ? 'default' : 'secondary'} className="text-xs">
            {isRecording ? (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                Recording
              </span>
            ) : (
              'Stopped'
            )}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {transcriptions.filter(t => t.isFinal).length} messages
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={selectedLanguage}
            onValueChange={setSelectedLanguage}
            options={SUPPORTED_LANGUAGES}
            className="w-32"
          />
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={transcriptions.length === 0}
          >
            <Download className="w-4 h-4" />
          </Button>

          <Button
            variant={isRecording ? 'destructive' : 'default'}
            size="sm"
            onClick={isRecording ? onStopRecording : onStartRecording}
          >
            {isRecording ? (
              <>
                <MicOff className="w-4 h-4 mr-2" />
                Stop
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 mr-2" />
                Record
              </>
            )}
          </Button>
        </div>
      </div>

      <ScrollArea className="h-80 p-4" ref={scrollRef}>
        {transcriptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Mic className="w-12 h-12 mb-2 opacity-50" />
            <p>No transcriptions yet</p>
            <p className="text-sm">Start recording to see live transcriptions</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transcriptions.map((transcription) => (
              <div
                key={transcription.id}
                className={`p-3 rounded-lg ${
                  transcription.isFinal
                    ? 'bg-gray-700/50 border border-gray-600'
                    : 'bg-gray-700/30 border border-gray-700/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-blue-400">
                        {transcription.user?.name || `Speaker ${transcription.speaker}`}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(transcription.timestamp).toLocaleTimeString()}
                      </span>
                      {!transcription.isFinal && (
                        <Badge variant="secondary" className="text-xs">
                          ...
                        </Badge>
                      )}
                      {transcription.confidence && (
                        <Badge variant="outline" className="text-xs">
                          {(transcription.confidence * 100).toFixed(0)}% confidence
                        </Badge>
                      )}
                    </div>
                    <p className={`text-white ${!transcription.isFinal ? 'opacity-70' : ''}`}>
                      {transcription.text}
                    </p>
                    {transcription.translated && (
                      <p className="text-sm text-gray-300 mt-1 border-t border-gray-600 pt-1">
                        🌐 {transcription.translated.text}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(transcription.text, transcription.id)}
                      className="h-8 w-8 p-0"
                    >
                      {copiedId === transcription.id ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTranslate(transcription.id)}
                      disabled={translatingId === transcription.id}
                      className="h-8 w-8 p-0"
                    >
                      {translatingId === transcription.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Languages className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
};