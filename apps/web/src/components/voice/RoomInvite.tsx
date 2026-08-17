// apps/web/src/components/voice/RoomInvite.tsx
import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/Dialog';
import { 
  Copy, 
  Check, 
  Share2, 
  Mail, 
  MessageCircle, 
  Twitter, 
  Facebook,
  Link,
  Clock,
  Users,
} from 'lucide-react';

interface RoomInviteProps {
  roomId: string;
  onClose: () => void;
}

export const RoomInvite: React.FC<RoomInviteProps> = ({ roomId, onClose }) => {
  const [inviteData, setInviteData] = useState<{
    inviteId: string;
    code: string;
    url: string;
    expiresAt: string;
    maxUses: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [maxUses, setMaxUses] = useState(10);
  const [expiresInHours, setExpiresInHours] = useState(24);

  const generateInvite = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/voice/invites/${roomId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ maxUses, expiresInHours }),
      });
      if (response.ok) {
        const data = await response.json();
        setInviteData(data);
      }
    } catch (error) {
      console.error('Failed to generate invite:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async (platform: string) => {
    if (!inviteData) return;

    const shareData = {
      title: 'Join my voice room on LingoVerse!',
      text: `Join me in this voice room! 🎙️\n${inviteData.url}`,
      url: inviteData.url,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.error('Share failed:', error);
      }
    } else {
      // Fallback for desktop
      const url = new URL('https://twitter.com/intent/tweet');
      url.searchParams.set('text', `Join me in this voice room! 🎙️ ${inviteData.url}`);
      window.open(url.toString(), '_blank');
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 border border-gray-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Invite to Room</DialogTitle>
        </DialogHeader>

        {!inviteData ? (
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Max Uses</Label>
              <Input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(Number(e.target.value))}
                className="bg-gray-700 border-gray-600 text-white"
                min={1}
                max={100}
              />
            </div>

            <div>
              <Label className="text-gray-300">Expires In</Label>
              <select
                value={expiresInHours}
                onChange={(e) => setExpiresInHours(Number(e.target.value))}
                className="w-full bg-gray-700 border-gray-600 text-white rounded-lg px-3 py-2"
              >
                <option value={1}>1 hour</option>
                <option value={6}>6 hours</option>
                <option value={12}>12 hours</option>
                <option value={24}>24 hours</option>
                <option value={72}>3 days</option>
                <option value={168}>7 days</option>
              </select>
            </div>

            <Button
              onClick={generateInvite}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Generating...' : 'Generate Invite Link'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-700/50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <code className="text-blue-400 text-sm break-all flex-1">
                  {inviteData.url}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(inviteData.url)}
                  className="ml-2"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Expires: {new Date(inviteData.expiresAt).toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {inviteData.maxUses} uses
              </span>
            </div>

            <div className="border-t border-gray-700 pt-4">
              <p className="text-gray-300 text-sm mb-3">Share via</p>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleShare('twitter')}
                  className="flex-1"
                >
                  <Twitter className="w-4 h-4 mr-2" />
                  Twitter
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleShare('facebook')}
                  className="flex-1"
                >
                  <Facebook className="w-4 h-4 mr-2" />
                  Facebook
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleShare('whatsapp')}
                  className="flex-1"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleShare('email')}
                  className="flex-1"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </Button>
              </div>
            </div>

            <Button
              variant="ghost"
              onClick={() => setInviteData(null)}
              className="w-full text-gray-400 hover:text-white"
            >
              Generate New Link
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};