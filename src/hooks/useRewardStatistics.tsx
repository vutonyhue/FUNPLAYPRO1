import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface RewardBreakdown {
  type: string;
  total: number;
  count: number;
}

interface DailyReward {
  date: string;
  amount: number;
}

interface UserStatistics {
  totalEarned: number;
  breakdown: RewardBreakdown[];
  dailyRewards: DailyReward[];
  todayLimits: {
    viewRewardsEarned: number;
    commentRewardsEarned: number;
    uploadCount: number;
  };
}

export const useRewardStatistics = (userId: string | undefined) => {
  const [statistics, setStatistics] = useState<UserStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchStatistics = async () => {
      try {
        // Get total from profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("total_camly_rewards")
          .eq("id", userId)
          .single();

        // Get breakdown by type
        const { data: transactions } = await supabase
          .from("reward_transactions")
          .select("reward_type, amount")
          .eq("user_id", userId);

        // Calculate breakdown
        const breakdownMap = new Map<string, { total: number; count: number }>();
        transactions?.forEach((tx) => {
          const existing = breakdownMap.get(tx.reward_type) || { total: 0, count: 0 };
          breakdownMap.set(tx.reward_type, {
            total: existing.total + Number(tx.amount),
            count: existing.count + 1,
          });
        });

        const breakdown: RewardBreakdown[] = Array.from(breakdownMap.entries()).map(
          ([type, data]) => ({ type, ...data })
        );

        // Get daily rewards for last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: recentTransactions } = await supabase
          .from("reward_transactions")
          .select("amount, created_at")
          .eq("user_id", userId)
          .gte("created_at", thirtyDaysAgo.toISOString())
          .order("created_at", { ascending: true });

        // Group by date
        const dailyMap = new Map<string, number>();
        recentTransactions?.forEach((tx) => {
          const date = new Date(tx.created_at).toISOString().split('T')[0];
          dailyMap.set(date, (dailyMap.get(date) || 0) + Number(tx.amount));
        });

        const dailyRewards: DailyReward[] = Array.from(dailyMap.entries()).map(
          ([date, amount]) => ({ date, amount })
        );

        // Get today's limits
        const today = new Date().toISOString().split('T')[0];
        const { data: limits } = await supabase
          .from("daily_reward_limits")
          .select("*")
          .eq("user_id", userId)
          .eq("date", today)
          .single();

        setStatistics({
          totalEarned: Number(profile?.total_camly_rewards) || 0,
          breakdown,
          dailyRewards,
          todayLimits: {
            viewRewardsEarned: Number(limits?.view_rewards_earned) || 0,
            commentRewardsEarned: Number(limits?.comment_rewards_earned) || 0,
            uploadCount: Number(limits?.uploads_count) || 0,
          },
        });
      } catch (error) {
        console.error("Error fetching reward statistics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [userId]);

  return { statistics, loading };
};

export const useRewardHistory = (userId: string | undefined) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      try {
        const { data } = await supabase
          .from("reward_transactions")
          .select(`
            *,
            videos (title)
          `)
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(100);

        setTransactions(data || []);
      } catch (error) {
        console.error("Error fetching reward history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [userId]);

  return { transactions, loading };
};
