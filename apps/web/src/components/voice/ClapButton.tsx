// apps/web/src/components/voice/ClapButton.tsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';
import { useSocket } from '../../hooks/useSocket';
import { cn } from '../../lib/utils';

interface ClapButtonProps {
  roomId: string;
  targetUserId?: string;
  onClap?: (count: number) => void;
  className?: string;
}

export const ClapButton: React.FC<ClapButtonProps> = ({
  roomId,
  targetUserId,
  onClap,
  className = '',
}) => {
  const [clapCount, setClapCount] = useState(0);
  const [totalClaps, setTotalClaps] = useState(0);
  const [isClapping, setIsClapping] = useState(false);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number }[]>([]);
  const [clapCooldown, setClapCooldown] = useState(false);
  const clapRef = useRef<HTMLButtonElement>(null);
  const socket = useSocket();
  const particleId = useRef(0);

  // Subscribe to clap events
  useEffect(() => {
    if (!socket) return;

    const handleClapReceived = (data: any) => {
      if (data.targetUserId === targetUserId || !targetUserId) {
        setClapCount(prev => prev + 1);
        if (onClap) {
          onClap(clapCount + 1);
        }
        createParticles();
      }
    };

    const handleClapStats = (data: any) => {
      setTotalClaps(data.totalClaps);
    };

    socket.on('clap-received', handleClapReceived);
    socket.on('clap-stats', handleClapStats);

    return () => {
      socket.off('clap-received', handleClapReceived);
      socket.off('clap-stats', handleClapStats);
    };
  }, [socket, targetUserId, clapCount]);

  const createParticles = () => {
    const newParticles = [];
    for (let i = 0; i < 12; i++) {
      newParticles.push({
        id: particleId.current++,
        x: (Math.random() - 0.5) * 200,
        y: (Math.random() - 0.5) * 200,
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.includes(p)));
    }, 1000);
  };

  const handleClap = async () => {
    if (clapCooldown) return;

    setIsClapping(true);
    setClapCooldown(true);

    try {
      const response = await fetch(`/api/voice/claps/${roomId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetUserId }),
      });

      if (response.ok) {
        const data = await response.json();
        setTotalClaps(data.totalClaps);
        createParticles();
        if (onClap) {
          onClap(data.totalClaps);
        }
      }
    } catch (error) {
      console.error('Failed to clap:', error);
    }

    setTimeout(() => {
      setIsClapping(false);
      setClapCooldown(false);
    }, 500);
  };

  // Clap animation variants
  const clapVariants = {
    idle: { scale: 1 },
    clapping: { 
      scale: [1, 1.2, 1],
      transition: { duration: 0.3 }
    },
  };

  return (
    <div className="relative">
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute pointer-events-none"
            initial={{ opacity: 1, x: 0, y: 0 }}
            animate={{
              opacity: 0,
              x: particle.x,
              y: particle.y - 100,
            }}
            transition={{ duration: 0.8 }}
          >
            <span className="text-2xl">👏</span>
          </motion.div>
        ))}
      </AnimatePresence>

      <motion.button
        ref={clapRef}
        className={cn(
          'relative flex items-center gap-3 px-6 py-4 rounded-full',
          'bg-gradient-to-r from-yellow-400 to-orange-500',
          'text-white font-bold text-lg',
          'shadow-lg hover:shadow-xl transition-all',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className
        )}
        variants={clapVariants}
        animate={isClapping ? 'clapping' : 'idle'}
        onClick={handleClap}
        disabled={clapCooldown}
      >
        <span className="text-2xl">👏</span>
        <span>Clap</span>
        <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">
          {totalClaps}
        </span>
      </motion.button>

      {/* Clap counter animation */}
      <AnimatePresence>
        {clapCount > 0 && (
          <motion.div
            className="absolute -top-8 -right-4 text-yellow-400 font-bold text-sm"
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.5, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            +{clapCount}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};