import { MessageCircle } from "lucide-react";

interface MusicCommentsProps {
  musicId: string;
  onCommentCountChange?: (count: number) => void;
}

// Placeholder component until comments table is created in database
export function MusicComments({ onCommentCountChange }: MusicCommentsProps) {
  return (
    <div className="space-y-6">
      {/* Comment Count */}
      <div className="flex items-center gap-2">
        <MessageCircle className="w-5 h-5" />
        <h3 className="text-lg font-semibold">0 bình luận</h3>
      </div>

      {/* Placeholder */}
      <div className="text-center py-8 text-muted-foreground">
        <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>Tính năng bình luận đang được phát triển</p>
        <p className="text-sm">Vui lòng quay lại sau!</p>
      </div>
    </div>
  );
}