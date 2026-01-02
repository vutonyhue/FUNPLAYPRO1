import { useState } from "react";
import { motion, Reorder } from "framer-motion";
import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PlaylistVideo {
  id: string;
  video_id: string;
  position: number;
  video?: {
    id: string;
    title: string;
    thumbnail_url: string | null;
  };
}

interface DraggableVideoListProps {
  videos: PlaylistVideo[];
  onReorder: (newOrder: PlaylistVideo[]) => void;
  onRemove?: (videoId: string) => void;
  playlistId: string;
}

export const DraggableVideoList = ({ 
  videos, 
  onReorder, 
  onRemove,
  playlistId 
}: DraggableVideoListProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleReorder = async (newOrder: PlaylistVideo[]) => {
    // Update local state immediately for smooth UX
    const updatedVideos = newOrder.map((video, index) => ({
      ...video,
      position: index
    }));
    onReorder(updatedVideos);
    
    // Save to database
    setIsSaving(true);
    try {
      const updates = updatedVideos.map(video => 
        supabase
          .from("meditation_playlist_videos")
          .update({ position: video.position })
          .eq("id", video.id)
      );
      
      await Promise.all(updates);
    } catch (error) {
      console.error("Error saving order:", error);
      toast({
        title: "Lỗi",
        description: "Không thể lưu thứ tự video",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async (videoId: string) => {
    try {
      await supabase
        .from("meditation_playlist_videos")
        .delete()
        .eq("id", videoId);
      
      if (onRemove) onRemove(videoId);
      
      toast({
        title: "Đã xóa",
        description: "Video đã được xóa khỏi playlist"
      });
    } catch (error) {
      console.error("Error removing video:", error);
      toast({
        title: "Lỗi",
        description: "Không thể xóa video",
        variant: "destructive"
      });
    }
  };

  if (videos.length === 0) {
    return (
      <div className="text-center py-8 text-amber-500 text-sm">
        Chưa có video trong playlist này
      </div>
    );
  }

  return (
    <div className="relative">
      {isSaving && (
        <div className="absolute top-2 right-2 text-xs text-amber-500 animate-pulse">
          Đang lưu...
        </div>
      )}
      
      <Reorder.Group 
        axis="y" 
        values={videos} 
        onReorder={handleReorder}
        className="space-y-2"
      >
        {videos.map((pv, index) => (
          <Reorder.Item
            key={pv.id}
            value={pv}
            className="cursor-grab active:cursor-grabbing"
          >
            <motion.div
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200/50 hover:border-amber-300 hover:shadow-md transition-all group"
            >
              {/* Drag Handle */}
              <div className="text-amber-400 group-hover:text-amber-600 transition-colors">
                <GripVertical className="w-5 h-5" />
              </div>
              
              {/* Position Number */}
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-white text-xs font-bold shadow-md">
                {index + 1}
              </div>
              
              {/* Thumbnail */}
              {pv.video?.thumbnail_url ? (
                <img 
                  src={pv.video.thumbnail_url} 
                  alt="" 
                  className="w-16 h-10 object-cover rounded-lg shadow-sm" 
                />
              ) : (
                <div className="w-16 h-10 bg-amber-200/50 rounded-lg flex items-center justify-center">
                  <span className="text-amber-400 text-xs">No image</span>
                </div>
              )}
              
              {/* Title */}
              <span className="flex-1 text-amber-800 font-medium truncate">
                {pv.video?.title || "Video không có tiêu đề"}
              </span>
              
              {/* Remove Button */}
              {onRemove && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(pv.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 hover:bg-red-50 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </motion.div>
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </div>
  );
};
