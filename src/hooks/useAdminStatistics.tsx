import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PlatformStats {
  totalUsers: number;
  totalVideos: number;
  totalViews: number;
  totalComments: number;
  totalRewardsDistributed: number;
  activeUsersToday: number;
}

interface TopCreator {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  videoCount: number;
  totalViews: number;
  totalRewards: number;
}

interface TopEarner {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  totalEarned: number;
}

interface DailyStats {
  date: string;
  activeUsers: number;
  rewardsDistributed: number;
  views: number;
  comments: number;
}

export const useAdminStatistics = () => {
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [topCreators, setTopCreators] = useState<TopCreator[]>([]);
  const [topEarners, setTopEarners] = useState<TopEarner[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminStats = async () => {
      try {
        // Get total users
        const { count: userCount } = await supabase
          .from("profiles")
          .select("*", { count: 'exact', head: true });

        // Get total videos
        const { count: videoCount } = await (supabase
          .from("videos") as any)
          .select("*", { count: 'exact', head: true });

        // Get total views (sum of all video view_count)
        const { data: videosData } = await (supabase
          .from("videos") as any)
          .select("view_count");
        const totalViews = videosData?.reduce((sum: number, v: any) => sum + (v.view_count || 0), 0) || 0;

        // Get total comments
        const { count: commentCount } = await (supabase
          .from("comments") as any)
          .select("*", { count: 'exact', head: true });

        // Get total rewards distributed
        const { data: rewardsData } = await (supabase
          .from("reward_transactions") as any)
          .select("amount");
        const totalRewards = rewardsData?.reduce((sum: number, r: any) => sum + Number(r.amount), 0) || 0;

        // Active users today - simplified since daily_reward_limits doesn't exist
        const activeToday = 0;

        setPlatformStats({
          totalUsers: userCount || 0,
          totalVideos: videoCount || 0,
          totalViews,
          totalComments: commentCount || 0,
          totalRewardsDistributed: totalRewards,
          activeUsersToday: activeToday,
        });

        // Get top creators (by video count and views)
        const { data: creatorsData } = await (supabase
          .from("videos") as any)
          .select(`
            channel_id,
            view_count,
            channels (user_id, name)
          `);

        const creatorMap = new Map<string, TopCreator>();
        creatorsData?.forEach((video: any) => {
          if (!video.channels?.user_id) return;
          const userId = video.channels.user_id;
          const existing = creatorMap.get(userId) || {
            userId,
            displayName: video.channels?.name || 'Unknown',
            avatarUrl: null,
            videoCount: 0,
            totalViews: 0,
            totalRewards: 0,
          };
          creatorMap.set(userId, {
            ...existing,
            videoCount: existing.videoCount + 1,
            totalViews: existing.totalViews + (video.view_count || 0),
          });
        });

        const sortedCreators = Array.from(creatorMap.values())
          .sort((a, b) => b.totalViews - a.totalViews)
          .slice(0, 10);
        setTopCreators(sortedCreators);

        // Get top earners
        const { data: earnersData } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url, total_camly_rewards")
          .order("total_camly_rewards", { ascending: false })
          .limit(10);

        const topEarnersList = earnersData?.map((p: any) => ({
          userId: p.user_id,
          displayName: p.display_name || 'Unknown',
          avatarUrl: p.avatar_url,
          totalEarned: Number(p.total_camly_rewards) || 0,
        })) || [];
        setTopEarners(topEarnersList);

        // Get daily stats for last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: rewardsDaily } = await (supabase
          .from("reward_transactions") as any)
          .select("amount, created_at")
          .gte("created_at", thirtyDaysAgo.toISOString());

        const { data: commentsDaily } = await (supabase
          .from("comments") as any)
          .select("created_at")
          .gte("created_at", thirtyDaysAgo.toISOString());

        // Aggregate daily stats
        const dailyMap = new Map<string, DailyStats>();
        
        // Initialize last 30 days
        for (let i = 0; i < 30; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          dailyMap.set(dateStr, {
            date: dateStr,
            activeUsers: 0,
            rewardsDistributed: 0,
            views: 0,
            comments: 0,
          });
        }

        rewardsDaily?.forEach((r: any) => {
          const date = new Date(r.created_at).toISOString().split('T')[0];
          const existing = dailyMap.get(date);
          if (existing) {
            existing.rewardsDistributed += Number(r.amount);
          }
        });

        commentsDaily?.forEach((c: any) => {
          const date = new Date(c.created_at).toISOString().split('T')[0];
          const existing = dailyMap.get(date);
          if (existing) {
            existing.comments += 1;
          }
        });

        const sortedDaily = Array.from(dailyMap.values())
          .sort((a, b) => a.date.localeCompare(b.date));
        setDailyStats(sortedDaily);

      } catch (error) {
        console.error("Error fetching admin statistics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminStats();
  }, []);

  return { platformStats, topCreators, topEarners, dailyStats, loading };
};
