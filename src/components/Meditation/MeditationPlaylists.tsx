import { useState } from "react";
import { motion } from "framer-motion";
import { Music, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// Placeholder component until meditation tables are created in database
export const MeditationPlaylists = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
          <Sparkles className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Thiền định</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Tính năng playlist thiền định đang được phát triển. Vui lòng quay lại sau!
        </p>
      </div>

      {/* Sample placeholder cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="overflow-hidden">
            <div className="aspect-video bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center">
              <Music className="w-12 h-12 text-muted-foreground/50" />
            </div>
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.div>
  );
};