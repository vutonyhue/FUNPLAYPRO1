import { Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Placeholder component until channels table is created in database
export const StudioSettings = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" />
          Cài đặt kênh
        </h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Thông tin kênh</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Settings className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              Tính năng cài đặt kênh đang được phát triển. Vui lòng quay lại sau!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};