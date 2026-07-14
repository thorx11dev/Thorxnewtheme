import React, { useState } from "react";
import { motion } from "framer-motion";
import { Zap, Users } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import TechnicalLabel from "@/components/ui/technical-label";

export function CommissionCalculator() {
    const [referralCount, setReferralCount] = useState(10);
    const [avgPoints, setAvgPoints] = useState(50000); // TX-Points per member
    const [guildMembers, setGuildMembers] = useState(8);

    const REFERRAL_RATE = 0.15; // 15% direct commission
    const VAULT_BONUS_RATE = 1.15; // 15% vault bonus at Rank B+

    const referralPoints = referralCount * avgPoints * REFERRAL_RATE;
    const guildVaultBonus = guildMembers * avgPoints * 0.15 * (VAULT_BONUS_RATE - 1);
    const totalPotential = referralPoints + guildVaultBonus;

    const formatPoints = (pts: number) =>
        `${Math.round(pts).toLocaleString()} TX-Pts`;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-zinc-950 border-2 border-black dark:border-white/10 p-8 shadow-[8px_8px_0px_#000] dark:shadow-[8px_8px_0px_rgba(255,255,255,0.05)] h-full"
        >
            <div className="flex items-center gap-2 mb-8 opacity-40">
                <Zap className="w-4 h-4" />
                <TechnicalLabel text="TX-POINTS ESTIMATOR" className="text-[10px] font-black tracking-widest" />
            </div>

            <div className="space-y-10">
                {/* Direct Referrals */}
                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <span className="text-xs font-bold uppercase tracking-tight text-black/60 dark:text-white/60">Direct Referrals</span>
                        <span className="text-sm font-black text-black dark:text-white">{referralCount} People</span>
                    </div>
                    <Slider
                        value={[referralCount]}
                        max={100}
                        step={1}
                        onValueChange={(val) => setReferralCount(val[0])}
                        className="py-1"
                    />
                </div>

                {/* Avg Points per Member */}
                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <span className="text-xs font-bold uppercase tracking-tight text-black/60 dark:text-white/60">Avg Member Points</span>
                        <span className="text-sm font-black text-black dark:text-white">{avgPoints.toLocaleString()} TX-Pts</span>
                    </div>
                    <Slider
                        value={[avgPoints]}
                        max={500000}
                        step={5000}
                        onValueChange={(val) => setAvgPoints(val[0])}
                        className="py-1"
                    />
                </div>

                {/* Guild Size */}
                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <span className="text-xs font-bold uppercase tracking-tight text-black/60 dark:text-white/60">Guild Size (Engine C)</span>
                        <span className="text-sm font-black text-black dark:text-white">{guildMembers} Members</span>
                    </div>
                    <Slider
                        value={[guildMembers]}
                        max={50}
                        step={1}
                        onValueChange={(val) => setGuildMembers(val[0])}
                        className="py-1"
                    />
                </div>

                {/* Results */}
                <div className="pt-8 border-t-2 border-black/5 dark:border-white/5 space-y-4">
                    <div className="flex justify-between items-center text-sm">
                        <span className="font-bold text-black/50 dark:text-white/50">Referral Commission</span>
                        <span className="font-black text-black dark:text-white">{formatPoints(referralPoints)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="font-bold text-black/50 dark:text-white/50">Guild Vault Bonus</span>
                        <span className="font-black text-black dark:text-white">{formatPoints(guildVaultBonus)}</span>
                    </div>
                    <div className="mt-8 bg-black dark:bg-white text-white dark:text-black p-6 shadow-[4px_4px_0px_#ff6b35]">
                        <div className="text-[10px] font-black uppercase tracking-widest text-[#ff6b35] mb-1">Your Potential</div>
                        <div className="text-4xl font-black tracking-tighter">
                            {formatPoints(totalPotential)}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
