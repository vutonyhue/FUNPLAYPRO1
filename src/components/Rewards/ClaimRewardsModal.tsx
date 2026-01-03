import { useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Coins, Sparkles, Gift, Wallet, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface ClaimRewardsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Placeholder component until reward_transactions table is created
export const ClaimRewardsModal = ({ open, onOpenChange }: ClaimRewardsModalProps) => {
  const { user } = useAuth();

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("vi-VN").format(num);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-background via-background to-primary/5 border-primary/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Gift className="h-6 w-6 text-yellow-500" />
            </motion.div>
            Claim CAMLY Rewards
            <Sparkles className="h-5 w-5 text-cyan-400" />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Total Unclaimed */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="relative p-6 rounded-2xl bg-gradient-to-r from-yellow-500/20 via-cyan-500/20 to-yellow-500/20 border border-yellow-500/30"
          >
            <div className="relative text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Coins className="h-8 w-8 text-yellow-500" />
                <span className="text-sm text-muted-foreground">Phần thưởng chờ claim</span>
              </div>
              
              <motion.p
                className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-cyan-400 bg-clip-text text-transparent"
              >
                {formatNumber(0)}
              </motion.p>
              <p className="text-sm text-muted-foreground">CAMLY</p>
            </div>
          </motion.div>

          {/* Development notice */}
          <div className="p-4 rounded-lg bg-muted/50 border border-muted">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Tính năng đang phát triển</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Hệ thống rewards đang được xây dựng. Vui lòng quay lại sau!
                </p>
              </div>
            </div>
          </div>

          <Button
            disabled
            className="w-full bg-gradient-to-r from-yellow-500/50 to-cyan-500/50"
          >
            <Wallet className="h-5 w-5 mr-2" />
            Kết nối ví để claim
          </Button>

          {/* Angel hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-xs text-center text-muted-foreground"
          >
            ✨ Hãy tiếp tục xem video và tương tác để nhận thêm CAMLY!
          </motion.p>
        </div>
      </DialogContent>
    </Dialog>
  );
};