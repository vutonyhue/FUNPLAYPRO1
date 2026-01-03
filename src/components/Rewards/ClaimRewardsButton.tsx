import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Coins, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ClaimRewardsModal } from "./ClaimRewardsModal";

interface ClaimRewardsButtonProps {
  compact?: boolean;
}

// Simplified component - reward_transactions table not available yet
export const ClaimRewardsButton = ({ compact = false }: ClaimRewardsButtonProps) => {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  if (!user) {
    return null;
  }

  // Compact version for mobile header
  if (compact) {
    return (
      <>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative"
        >
          <Button
            onClick={() => setModalOpen(true)}
            variant="ghost"
            size="icon"
            className="relative h-8 w-8 text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10"
          >
            <Coins className="h-4 w-4" />
          </Button>
        </motion.div>

        <ClaimRewardsModal open={modalOpen} onOpenChange={setModalOpen} />
      </>
    );
  }

  // Full version
  return (
    <>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative"
      >
        <Button
          onClick={() => setModalOpen(true)}
          className="relative bg-gradient-to-r from-yellow-500 to-cyan-500 hover:from-yellow-600 hover:to-cyan-600 text-white font-bold shadow-lg"
        >
          <Coins className="h-5 w-5 mr-2" />
          Claim Rewards
          
          {/* Sparkle decoration */}
          <motion.div
            className="absolute -top-1 -right-1"
            animate={{ scale: [1, 1.3, 1], rotate: [0, 180, 360] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="h-4 w-4 text-yellow-400" />
          </motion.div>
        </Button>
      </motion.div>

      <ClaimRewardsModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
};