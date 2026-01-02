import { Users, Video, Eye, MessageSquare, Coins, UserPlus, Crown } from "lucide-react";
import { useHonobarStats } from "@/hooks/useHonobarStats";
import { CounterAnimation } from "./CounterAnimation";
import { motion } from "framer-motion";

export const Honobar = () => {
  const { stats, loading } = useHonobarStats();

  const statItems = [
    {
      icon: Users,
      label: "Người dùng",
      labelEn: "Total Users",
      value: stats.totalUsers,
    },
    {
      icon: Video,
      label: "Video",
      labelEn: "Total Videos",
      value: stats.totalVideos,
    },
    {
      icon: Eye,
      label: "Lượt xem",
      labelEn: "Total Views",
      value: stats.totalViews,
    },
    {
      icon: MessageSquare,
      label: "Bình luận",
      labelEn: "Total Comments",
      value: stats.totalComments,
    },
    {
      icon: Coins,
      label: "Phần thưởng",
      labelEn: "Total Rewards",
      value: stats.totalRewards,
      decimals: 3,
      isCrypto: true,
    },
    {
      icon: UserPlus,
      label: "Đăng ký",
      labelEn: "Channel Subs",
      value: stats.totalSubscriptions,
    },
  ];

  if (loading) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="absolute top-4 right-4 z-20"
      >
        <div className="grid grid-cols-3 gap-2 p-4 rounded-2xl bg-gradient-to-br from-[#00E7FF]/10 via-background/80 to-[#FFD700]/10 backdrop-blur-xl border-2 border-[#00E7FF]/40 shadow-[0_0_40px_rgba(0,231,255,0.3),0_0_60px_rgba(255,215,0,0.2)]">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gradient-to-br from-[#00E7FF]/20 to-[#FFD700]/20 rounded-xl h-16 w-20" />
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, type: "spring" }}
      className="absolute top-4 right-4 z-20"
    >
      {/* Main Container with Turquoise & Gold theme */}
      <div className="relative">
        {/* Glow effect behind */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#00E7FF]/30 to-[#FFD700]/30 blur-xl" />
        
        <div className="relative grid grid-cols-3 gap-2 p-4 rounded-2xl bg-gradient-to-br from-[#00E7FF]/5 via-background/95 to-[#FFD700]/5 backdrop-blur-xl border-2 border-[#00E7FF]/50 shadow-[0_0_30px_rgba(0,231,255,0.3),0_0_50px_rgba(255,215,0,0.2)]">
          {/* Header Badge */}
          <div className="col-span-3 flex items-center justify-center gap-2 mb-2 pb-2 border-b border-[#00E7FF]/30">
            <Crown className="w-4 h-4 text-[#FFD700]" />
            <span className="text-xs font-bold bg-gradient-to-r from-[#00E7FF] via-[#7A2BFF] to-[#FFD700] bg-clip-text text-transparent">
              HONOR BOARD
            </span>
            <Crown className="w-4 h-4 text-[#FFD700]" />
          </div>
          
          {statItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.labelEn}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                className="relative group"
              >
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#00E7FF]/10 to-[#FFD700]/10 backdrop-blur-sm border border-[#00E7FF]/30 px-3 py-2.5 hover:border-[#FFD700]/60 transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,215,0,0.4)]">
                  {/* Shimmer effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 3, repeat: Infinity, delay: index * 0.2 }}
                  />
                  
                  <div className="relative flex flex-col items-center gap-1">
                    <motion.div
                      animate={{ 
                        scale: [1, 1.15, 1],
                      }}
                      transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
                      className="p-1.5 rounded-lg bg-gradient-to-br from-[#00E7FF]/20 to-[#FFD700]/20"
                    >
                      <Icon className="w-4 h-4 text-[#00E7FF]" />
                    </motion.div>
                    
                    <div className="text-[9px] text-muted-foreground font-medium whitespace-nowrap leading-tight text-center">
                      {item.label}
                    </div>
                    
                    <motion.div 
                      className="text-sm font-bold bg-gradient-to-r from-[#00E7FF] to-[#FFD700] bg-clip-text text-transparent tabular-nums leading-tight"
                      animate={{ 
                        textShadow: [
                          "0 0 4px rgba(0,231,255,0.3)",
                          "0 0 8px rgba(255,215,0,0.5)",
                          "0 0 4px rgba(0,231,255,0.3)"
                        ]
                      }}
                      transition={{ duration: 2, repeat: Infinity, delay: index * 0.15 }}
                    >
                      <CounterAnimation 
                        value={item.value} 
                        decimals={item.decimals || 0}
                      />
                      {item.isCrypto && <span className="text-[8px] ml-0.5 text-[#FFD700]">CAMLY</span>}
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};
