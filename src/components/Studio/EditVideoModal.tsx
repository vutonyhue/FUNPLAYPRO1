import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Video } from "lucide-react";

interface Video {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  is_public: boolean | null;
}

interface EditVideoModalProps {
  video: Video;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

// Placeholder component until videos table is created in database
export const EditVideoModal = ({ open, onClose }: EditVideoModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Chỉnh sửa Video</DialogTitle>
        </DialogHeader>
        <div className="text-center py-8">
          <Video className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">
            Tính năng chỉnh sửa video đang được phát triển.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
