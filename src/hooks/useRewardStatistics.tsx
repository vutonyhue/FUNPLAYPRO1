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
          .eq("user_id", userId)
          .maybeSingle();

        // Get breakdown by type
        const { data: transactions } = await (supabase
          .from("reward_transactions") as any)
          .select("type, amount")
          .eq("user_id", userId);

        // Calculate breakdown
        const breakdownMap = new Map<string, { total: number; count: number }>();
        transactions?.forEach((tx: any) => {
          const type = tx.type || 'unknown';
          const existing = breakdownMap.get(type) || { total: 0, count: 0 };
          breakdownMap.set(type, {
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

        const { data: recentTransactions } = await (supabase
          .from("reward_transactions") as any)
          .select("amount, created_at")
          .eq("user_id", userId)
          .gte("created_at", thirtyDaysAgo.toISOString())
          .order("created_at", { ascending: true });

        // Group by date
        const dailyMap = new Map<string, number>();
        recentTransactions?.forEach((tx: any) => {
          const date = new Date(tx.created_at).toISOString().split('T')[0];
          dailyMap.set(date, (dailyMap.get(date) || 0) + Number(tx.amount));
        });

        const dailyRewards: DailyReward[] = Array.from(dailyMap.entries()).map(
          ([date, amount]) => ({ date, amount })
        );

        setStatistics({
          totalEarned: Number(profile?.total_camly_rewards) || 0,
          breakdown,
          dailyRewards,
          todayLimits: {
            viewRewardsEarned: 0,
            commentRewardsEarned: 0,
            uploadCount: 0,
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
        const { data } = await (supabase
          .from("reward_transactions") as any)
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
