import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FlyingCoinsProps {
  isActive: boolean;
  count?: number;
  originX?: number;
  originY?: number;
}

export const FlyingCoins: React.FC<FlyingCoinsProps> = ({
  isActive,
  count = 8,
  originX = 0,
  originY = 0,
}) => {
  const coins = Array.from({ length: count }, (_, i) => i);

  return (
    <AnimatePresence>
      {isActive && (
        <div 
          className="fixed pointer-events-none z-[9999]"
          style={{ left: originX, top: originY }}
        >
          {coins.map((i) => {
            // Random trajectory for each coin
            const angle = (i / count) * 360 + Math.random() * 30;
            const distance = 80 + Math.random() * 120;
            const endX = Math.cos((angle * Math.PI) / 180) * distance;
            const endY = Math.sin((angle * Math.PI) / 180) * distance - 50; // Upward bias
            const delay = i * 0.05;
            const duration = 1 + Math.random() * 0.5;
            const rotation = Math.random() * 720 - 360;

            return (
              <motion.div
                key={i}
                className="absolute"
                initial={{ 
                  x: 0, 
                  y: 0, 
                  scale: 0,
                  rotate: 0,
                  opacity: 0,
                }}
                animate={{ 
                  x: endX, 
                  y: endY,
                  scale: [0, 1.2, 1, 0.8],
                  rotate: rotation,
                  opacity: [0, 1, 1, 0],
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: duration,
                  delay: delay,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {/* Coin with golden glow */}
                <div className="relative">
                  <motion.div
                    className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500 flex items-center justify-center text-xs font-bold text-amber-800 shadow-[0_0_15px_rgba(255,215,0,0.8)]"
                    animate={{
                      boxShadow: [
                        '0 0 15px rgba(255,215,0,0.8)',
                        '0 0 25px rgba(255,215,0,1)',
                        '0 0 15px rgba(255,215,0,0.8)',
                      ],
                    }}
                    transition={{
                      duration: 0.4,
                      repeat: Infinity,
                    }}
                  >
                    <span className="drop-shadow-sm">C</span>
                  </motion.div>
                  
                  {/* Sparkle trail */}
                  <motion.div
                    className="absolute -top-1 -right-1 text-yellow-300 text-xs"
                    animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
                    transition={{ duration: 0.3, repeat: 2 }}
                  >
                    ✨
                  </motion.div>
                </div>
              </motion.div>
            );
          })}

          {/* Central burst effect */}
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: [0, 2, 3], opacity: [1, 0.5, 0] }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-16 h-16 rounded-full bg-gradient-radial from-yellow-400/80 to-transparent" />
          </motion.div>

          {/* Text popup */}
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap"
            initial={{ y: 0, opacity: 0, scale: 0.5 }}
            animate={{ y: -60, opacity: [0, 1, 1, 0], scale: 1 }}
            transition={{ duration: 1.5, delay: 0.2 }}
          >
            <span className="text-lg font-bold text-yellow-400 drop-shadow-[0_0_10px_rgba(255,215,0,0.9)]">
              +CAMLY 💰
            </span>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default FlyingCoins;
