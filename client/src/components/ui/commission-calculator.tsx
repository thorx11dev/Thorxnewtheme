import React, { useState } from "react";
import { motion } from "framer-motion";
import { DollarSign } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import TechnicalLabel from "@/components/ui/technical-label";

export function CommissionCalculator() {
    const [l1Count, setL1Count] = useState(10);
    const [l2Count, setL2Count] = useState(25);
    const [avgEarning, setAvgEarning] = useState(5000);

    const l1Rate = 0.15; // 15%
    const l2Rate = 0.075; // 7.5%

    const l1Earnings = l1Count * avgEarning * l1Rate;
    const l2Earnings = l2Count * avgEarning * l2Rate;
    const totalPotential = l1Earnings + l2Earnings;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border-2 border-black p-8 shadow-[8px_8px_0px_#000] h-full"
        >
            <div className="flex items-center gap-2 mb-8 opacity-40">
                <DollarSign className="w-4 h-4" />
                <TechnicalLabel text="EARNINGS ESTIMATOR" className="text-[10px] font-black tracking-widest" />
            </div>

            <div className="space-y-10">
                {/* L1 Input */}
                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <span className="text-xs font-bold uppercase tracking-tight text-black/60">Level 1 Size</span>
                        <span className="text-sm font-black text-black">{l1Count} People</span>
                    </div>
                    <Slider
                        value={[l1Count]}
                        max={100}
                        step={1}
                        onValueChange={(val) => setL1Count(val[0])}
                        className="py-1"
                    />
                </div>

                {/* L2 Input */}
                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <span className="text-xs font-bold uppercase tracking-tight text-black/60">Level 2 Size</span>
                        <span className="text-sm font-black text-black">{l2Count} People</span>
                    </div>
                    <Slider
                        value={[l2Count]}
                        max={500}
                        step={5}
                        onValueChange={(val) => setL2Count(val[0])}
                        className="py-1"
                    />
                </div>

                {/* Avg Earning Input */}
                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <span className="text-xs font-bold uppercase tracking-tight text-black/60">Avg Member Earning</span>
                        <span className="text-sm font-black text-black">{formatCurrency(avgEarning)}</span>
                    </div>
                    <Slider
                        value={[avgEarning]}
                        max={50000}
                        step={500}
                        onValueChange={(val) => setAvgEarning(val[0])}
                        className="py-1"
                    />
                </div>

                {/* Simplified Results */}
                <div className="pt-8 border-t-2 border-black/5 space-y-4">
                    <div className="flex justify-between items-center text-sm">
                        <span className="font-bold text-black/50">Level 1 Earnings</span>
                        <span className="font-black text-black">{formatCurrency(l1Earnings)}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                        <span className="font-bold text-black/50">Level 2 Earnings</span>
                        <span className="font-black text-black">{formatCurrency(l2Earnings)}</span>
                    </div>

                    <div className="mt-8 bg-black text-white p-6 shadow-[4px_4px_0px_var(--primary)]">
                        <div className="text-[10px] font-black uppercase tracking-widest text-primary/80 mb-1">Your Earnings</div>
                        <div className="text-4xl font-black tracking-tighter">
                            {formatCurrency(totalPotential)}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
