import { Music } from "lucide-react";

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
  onReorder: (videos: PlaylistVideo[]) => void;
  onRemove?: (videoId: string) => void;
}

// Placeholder component until meditation tables are created
export const DraggableVideoList = ({ videos }: DraggableVideoListProps) => {
  if (videos.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Chưa có video nào trong playlist</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {videos.map((video) => (
        <div
          key={video.id}
          className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
        >
          <div className="w-24 h-14 bg-muted rounded flex items-center justify-center">
            <Music className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{video.video?.title || "Video"}</p>
          </div>
        </div>
      ))}
    </div>
  );
};