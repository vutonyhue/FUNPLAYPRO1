import { ListVideo } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AddToPlaylistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoId: string;
  videoTitle?: string;
}

// Placeholder component until playlist tables are created in database
export function AddToPlaylistModal({
  open,
  onOpenChange,
  videoTitle,
}: AddToPlaylistModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Lưu video vào...</DialogTitle>
          {videoTitle && (
            <DialogDescription className="truncate">
              {videoTitle}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="py-2">
          <div className="text-center py-8">
            <ListVideo className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">
              Tính năng playlist đang được phát triển
            </p>
            <p className="text-sm text-muted-foreground">
              Vui lòng quay lại sau!
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}