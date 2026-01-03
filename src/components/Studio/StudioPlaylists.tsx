import { ListVideo, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

// Placeholder component until playlists table is created in database
export const StudioPlaylists = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ListVideo className="w-6 h-6 text-primary" />
          Danh sách phát
        </h2>
        <Button disabled>
          <Plus className="w-4 h-4 mr-2" />
          Tạo playlist
        </Button>
      </div>

      <div className="text-center py-12">
        <ListVideo className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-medium mb-2">Tính năng đang phát triển</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Hệ thống playlist đang được xây dựng. Vui lòng quay lại sau!
        </p>
      </div>
    </div>
  );
};