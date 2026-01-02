import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const categories = [
  "Tất cả",
  "Âm nhạc",
  "Trực tiếp",
  "Danh sách kết hợp",
  "Trò chơi",
  "Podcast",
  "Tin tức",
  "Thiên nhiên",
  "Thủ công",
  "Mới tải lên gần đây",
  "Đã xem",
  "Đề xuất mới",
];

interface CategoryChipsProps {
  selected?: string;
  onSelect?: (category: string) => void;
}

export const CategoryChips = ({ selected = "Tất cả", onSelect }: CategoryChipsProps) => {
  return (
    <div className="border-b border-border bg-background">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3 px-4 py-3">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selected === category ? "default" : "secondary"}
              size="sm"
              className={`rounded-full px-4 h-8 text-sm font-medium transition-all border border-cyan-400/30 ${
                selected === category
                  ? "bg-gradient-to-r from-[#00E5FF] via-[#00B8D4] to-[#0091EA] text-white shadow-[0_0_20px_rgba(0,229,255,0.4)] hover:shadow-[0_0_25px_rgba(0,229,255,0.6)]"
                  : "bg-gradient-to-r from-[#00E5FF]/70 via-[#00B8D4]/70 to-[#0091EA]/70 text-white/90 hover:from-[#00E5FF] hover:via-[#00B8D4] hover:to-[#0091EA] hover:text-white hover:shadow-[0_0_15px_rgba(0,229,255,0.3)]"
              }`}
              onClick={() => onSelect?.(category)}
            >
              {category}
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};
