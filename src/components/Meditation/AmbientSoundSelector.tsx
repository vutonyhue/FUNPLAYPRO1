import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { CloudRain, Waves, Wind, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

// Singing bowl icon component
const SingingBowl = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <ellipse cx="12" cy="16" rx="8" ry="3" />
    <path d="M4 16c0-4 3.6-8 8-8s8 4 8 8" />
    <circle cx="12" cy="6" r="1" fill="currentColor" />
    <path d="M12 7v5" strokeLinecap="round" />
  </svg>
);

interface AmbientSound {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  url: string;
}

const ambientSounds: AmbientSound[] = [
  { 
    id: "rain", 
    name: "Mưa", 
    icon: CloudRain, 
    url: "https://assets.mixkit.co/sfx/preview/mixkit-light-rain-loop-2393.mp3" 
  },
  { 
    id: "waves", 
    name: "Sóng biển", 
    icon: Waves, 
    url: "https://assets.mixkit.co/sfx/preview/mixkit-sea-waves-loop-1196.mp3" 
  },
  { 
    id: "wind", 
    name: "Gió", 
    icon: Wind, 
    url: "https://assets.mixkit.co/sfx/preview/mixkit-forest-wind-ambience-1232.mp3" 
  },
  { 
    id: "bowls", 
    name: "Chuông", 
    icon: SingingBowl, 
    url: "https://assets.mixkit.co/sfx/preview/mixkit-meditation-bell-595.mp3" 
  },
];

interface AmbientSoundSelectorProps {
  isCompact?: boolean;
}

export const AmbientSoundSelector = ({ isCompact = false }: AmbientSoundSelectorProps) => {
  const [activeSound, setActiveSound] = useState<string | null>(null);
  const [volume, setVolume] = useState(30);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  const toggleSound = (soundId: string) => {
    if (activeSound === soundId) {
      setActiveSound(null);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    } else {
      const sound = ambientSounds.find(s => s.id === soundId);
      if (sound && audioRef.current) {
        audioRef.current.src = sound.url;
        audioRef.current.loop = true;
        audioRef.current.volume = volume / 100;
        audioRef.current.play().catch(console.error);
        setActiveSound(soundId);
      }
    }
  };

  if (isCompact) {
    return (
      <div className="flex items-center gap-2">
        <audio ref={audioRef} />
        {ambientSounds.map((sound) => {
          const Icon = sound.icon;
          const isActive = activeSound === sound.id;
          return (
            <Button
              key={sound.id}
              variant="ghost"
              size="sm"
              onClick={() => toggleSound(sound.id)}
              className={`px-2 ${
                isActive 
                  ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/50' 
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
              title={sound.name}
            >
              <Icon className="w-4 h-4" />
            </Button>
          );
        })}
        {activeSound && (
          <div className="flex items-center gap-2 ml-2">
            <Volume2 className="w-4 h-4 text-amber-300" />
            <Slider
              value={[volume]}
              onValueChange={(v) => setVolume(v[0])}
              max={100}
              step={1}
              className="w-20"
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-amber-200/50"
    >
      <audio ref={audioRef} />
      
      <h4 className="text-amber-800 font-medium mb-3 flex items-center gap-2">
        <Volume2 className="w-4 h-4 text-amber-500" />
        Âm thanh thiên nhiên
      </h4>
      
      <div className="grid grid-cols-4 gap-2 mb-4">
        {ambientSounds.map((sound) => {
          const Icon = sound.icon;
          const isActive = activeSound === sound.id;
          return (
            <motion.button
              key={sound.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => toggleSound(sound.id)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all ${
                isActive 
                  ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-lg shadow-amber-300/50' 
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/50'
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs font-medium">{sound.name}</span>
              {isActive && (
                <motion.div 
                  className="w-2 h-2 bg-white rounded-full"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {activeSound && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex items-center gap-3 pt-3 border-t border-amber-200/50"
        >
          <span className="text-amber-600 text-sm">Âm lượng:</span>
          <Slider
            value={[volume]}
            onValueChange={(v) => setVolume(v[0])}
            max={100}
            step={1}
            className="flex-1"
          />
          <span className="text-amber-500 text-sm w-10">{volume}%</span>
        </motion.div>
      )}
    </motion.div>
  );
};
