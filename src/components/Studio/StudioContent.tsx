import { Video, FileVideo, Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Placeholder component until videos table is created in database
export const StudioContent = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileVideo className="w-6 h-6 text-primary" />
          Nội dung
        </h2>
        <Button disabled>
          <Upload className="w-4 h-4 mr-2" />
          Tải video lên
        </Button>
      </div>

      <div className="text-center py-12">
        <Video className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-medium mb-2">Tính năng đang phát triển</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Hệ thống quản lý video đang được xây dựng. Vui lòng quay lại sau!
        </p>
      </div>

      {/* Placeholder cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="overflow-hidden">
            <div className="aspect-video bg-muted flex items-center justify-center">
              <Video className="w-12 h-12 text-muted-foreground/30" />
            </div>
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};