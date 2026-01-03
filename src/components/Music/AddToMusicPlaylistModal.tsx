import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Music } from "lucide-react";

interface AddToMusicPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackId: string;
  trackTitle: string;
}

// Placeholder component until playlist tables are created in database
export function AddToMusicPlaylistModal({
  isOpen,
  onClose,
  trackTitle,
}: AddToMusicPlaylistModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="w-5 h-5" />
            Thêm vào Playlist
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Track being added */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Bài hát:</p>
            <p className="font-medium truncate">{trackTitle}</p>
          </div>

          <div className="text-center py-8">
            <Music className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              Tính năng playlist đang được phát triển.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Vui lòng quay lại sau!
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}