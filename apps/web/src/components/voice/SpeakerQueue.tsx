// apps/web/src/components/voice/SpeakerQueue.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { ScrollArea } from '../ui/ScrollArea';
import { useSocket } from '../../hooks/useSocket';
import { 
  ChevronUp, 
  ChevronDown, 
  UserPlus, 
  UserMinus,
  Mic,
  Crown,
  Star,
  Clock,
} from 'lucide-react';

interface QueueItem {
  id: string;
  userId: string;
  position: number;
  status: 'PENDING' | 'INVITED' | 'SPEAKING' | 'COMPLETED';
  invitedBy?: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string;
  };
}

interface SpeakerQueueProps {
  roomId: string;
  isModerator: boolean;
  onPromote?: (userId: string) => void;
  onRemove?: (userId: string) => void;
  onInvite?: (userId: string) => void;
}

export const SpeakerQueue: React.FC<SpeakerQueueProps> = ({
  roomId,
  isModerator,
  onPromote,
  onRemove,
  onInvite,
}) => {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const socket = useSocket();

  // Load queue
  useEffect(() => {
    const loadQueue = async () => {
      try {
        const response = await fetch(`/api/voice/queue/${roomId}`);
        if (response.ok) {
          const data = await response.json();
          setQueue(data);
        }
      } catch (error) {
        console.error('Failed to load queue:', error);
      }
    };
    loadQueue();
  }, [roomId]);

  // Subscribe to queue updates
  useEffect(() => {
    if (!socket) return;

    const handleQueueUpdate = (data: any) => {
      setQueue(data.queue || []);
    };

    socket.on('queue-updated', handleQueueUpdate);

    return () => {
      socket.off('queue-updated', handleQueueUpdate);
    };
  }, [socket]);

  const handlePromote = async (userId: string) => {
    try {
      const response = await fetch(`/api/voice/queue/promote/${roomId}/${userId}`, {
        method: 'POST',
      });
      if (response.ok) {
        setQueue(prev => prev.filter(item => item.userId !== userId));
        if (onPromote) onPromote(userId);
      }
    } catch (error) {
      console.error('Failed to promote:', error);
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      const response = await fetch(`/api/voice/queue/${roomId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });
      if (response.ok) {
        setQueue(prev => prev.filter(item => item.userId !== userId));
        if (onRemove) onRemove(userId);
      }
    } catch (error) {
      console.error('Failed to remove from queue:', error);
    }
  };

  const handleInvite = async (userId: string) => {
    try {
      const response = await fetch(`/api/voice/queue/invite/${roomId}/${userId}`, {
        method: 'POST',
      });
      if (response.ok) {
        // Refresh queue
        const queueResponse = await fetch(`/api/voice/queue/${roomId}`);
        if (queueResponse.ok) {
          const data = await queueResponse.json();
          setQueue(data);
        }
        if (onInvite) onInvite(userId);
      }
    } catch (error) {
      console.error('Failed to invite:', error);
    }
  };

  const handleJoinQueue = async () => {
    try {
      const response = await fetch(`/api/voice/queue/${roomId}`, {
        method: 'POST',
      });
      if (response.ok) {
        const queueResponse = await fetch(`/api/voice/queue/${roomId}`);
        if (queueResponse.ok) {
          const data = await queueResponse.json();
          setQueue(data);
        }
      }
    } catch (error) {
      console.error('Failed to join queue:', error);
    }
  };

  return (
    <Card className="bg-gray-800 border border-gray-700">
      <div 
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-700/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <h3 className="text-white font-semibold">Speaker Queue</h3>
          <Badge variant="secondary" className="text-xs">
            {queue.length} waiting
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleJoinQueue();
            }}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Join Queue
          </Button>
          <Button variant="ghost" size="sm" className="p-1">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <ScrollArea className="max-h-60 p-4">
              {queue.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No one in the queue</p>
                  <p className="text-xs">Be the first to request to speak!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {queue.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50 border border-gray-600/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-600 text-white text-sm font-bold">
                          {item.position}
                        </div>
                        <Avatar src={item.user.avatarUrl} alt={item.user.name} size="sm" />
                        <div>
                          <p className="text-white font-medium text-sm">{item.user.name}</p>
                          <div className="flex items-center gap-2">
                            {item.status === 'INVITED' && (
                              <Badge variant="default" className="text-xs">
                                <Star className="w-3 h-3 mr-1" />
                                Invited
                              </Badge>
                            )}
                            {item.invitedBy && (
                              <span className="text-xs text-gray-400">
                                Invited by moderator
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {isModerator && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePromote(item.userId)}
                            className="h-8 w-8 p-0 text-green-400 hover:text-green-300"
                          >
                            <Mic className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemove(item.userId)}
                            className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                          >
                            <UserMinus className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};