import { motion, AnimatePresence, Reorder } from "framer-motion";
import { X, Trash2, ListMusic, GripVertical, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMusicPlayer, Track } from "@/contexts/MusicPlayerContext";
import { cn } from "@/lib/utils";

interface QueuePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QueuePanel = ({ isOpen, onClose }: QueuePanelProps) => {
  const { 
    queue, 
    currentIndex, 
    currentTrack,
    removeFromQueue, 
    reorderQueue, 
    clearQueue 
  } = useMusicPlayer();

  const handleReorder = (newOrder: Track[]) => {
    // Find the moved item and update
    const currentTrackId = queue[currentIndex]?.id;
    const newCurrentIndex = newOrder.findIndex(t => t.id === currentTrackId);
    
    // Update queue through context
    newOrder.forEach((track, newIdx) => {
      const oldIdx = queue.findIndex(t => t.id === track.id);
      if (oldIdx !== newIdx && oldIdx !== -1) {
        reorderQueue(oldIdx, newIdx);
      }
    });
  };

  const upNextTracks = queue.slice(currentIndex + 1);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
            onClick={onClose}
          />
          
          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-l border-cyan-500/20 z-[61] shadow-2xl"
          >
            {/* Cosmic background stars */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(30)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-white rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    opacity: [0.2, 0.8, 0.2],
                    scale: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 2 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                  }}
                />
              ))}
              {/* Golden glow */}
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-amber-500/10 to-transparent" />
            </div>

            {/* Header */}
            <div className="relative p-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-amber-500/20">
                    <ListMusic className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-white flex items-center gap-2">
                      Danh sách phát
                      <Sparkles className="w-4 h-4 text-amber-400" />
                    </h2>
                    <p className="text-xs text-white/60">{queue.length} bài hát</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-white/60 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Current Playing */}
            {currentTrack && (
              <div className="p-4 border-b border-white/10">
                <p className="text-xs text-cyan-400 uppercase tracking-wider mb-2">Đang phát</p>
                <motion.div 
                  className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-cyan-500/20 to-amber-500/20 border border-cyan-500/30"
                  animate={{
                    boxShadow: [
                      "0 0 20px rgba(0, 231, 255, 0.2)",
                      "0 0 30px rgba(0, 231, 255, 0.4)",
                      "0 0 20px rgba(0, 231, 255, 0.2)",
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                    {currentTrack.thumbnail_url ? (
                      <img 
                        src={currentTrack.thumbnail_url} 
                        alt={currentTrack.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-cyan-500 to-amber-500 flex items-center justify-center">
                        <ListMusic className="w-6 h-6 text-white" />
                      </div>
                    )}
                    {/* Playing indicator */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <div className="flex gap-0.5">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className="w-1 bg-cyan-400 rounded-full"
                            animate={{ height: [4, 12, 4] }}
                            transition={{
                              duration: 0.5,
                              repeat: Infinity,
                              delay: i * 0.1,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white truncate">{currentTrack.title}</h3>
                    {currentTrack.channelName && (
                      <p className="text-xs text-white/60 truncate">{currentTrack.channelName}</p>
                    )}
                  </div>
                </motion.div>
              </div>
            )}

            {/* Up Next */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-4 pb-2 flex items-center justify-between">
                <p className="text-xs text-amber-400 uppercase tracking-wider">
                  Tiếp theo ({upNextTracks.length})
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearQueue}
                    className="text-xs text-white/60 hover:text-white"
                  >
                    Xóa hàng đợi
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-cyan-400 hover:text-cyan-300"
                  >
                    <Save className="w-3 h-3 mr-1" />
                    Lưu playlist
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1 px-4 pb-4">
                {upNextTracks.length === 0 ? (
                  <div className="text-center py-8 text-white/40">
                    <ListMusic className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Hàng đợi trống</p>
                    <p className="text-xs mt-1">Thêm bài hát để tiếp tục nghe nhạc</p>
                  </div>
                ) : (
                  <Reorder.Group 
                    axis="y" 
                    values={upNextTracks} 
                    onReorder={handleReorder}
                    className="space-y-2"
                  >
                    {upNextTracks.map((track, idx) => (
                      <Reorder.Item
                        key={track.id}
                        value={track}
                        className="cursor-grab active:cursor-grabbing"
                      >
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          className={cn(
                            "flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
                          )}
                        >
                          <div className="text-white/30 group-hover:text-white/60">
                            <GripVertical className="w-4 h-4" />
                          </div>
                          <span className="text-xs text-white/40 w-5">{idx + 1}</span>
                          <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0">
                            {track.thumbnail_url ? (
                              <img 
                                src={track.thumbnail_url} 
                                alt={track.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-cyan-500/50 to-amber-500/50 flex items-center justify-center">
                                <ListMusic className="w-4 h-4 text-white/60" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm text-white truncate">{track.title}</h4>
                            {track.channelName && (
                              <p className="text-xs text-white/40 truncate">{track.channelName}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFromQueue(currentIndex + 1 + idx)}
                            className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </motion.div>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                )}
              </ScrollArea>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
