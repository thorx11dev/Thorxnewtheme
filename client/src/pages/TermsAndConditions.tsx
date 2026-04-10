import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck, Scale, AlertTriangle, Users, Wallet, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import TextBlockAnimation from "@/components/ui/text-block-animation";
import { useState, useEffect } from "react";

const Section = ({ title, icon: Icon, children, id, trigger }: { title: string, icon?: any, children: React.ReactNode, id?: string, trigger?: number }) => (
    <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-16 border-l-2 border-black dark:border-white pl-6 md:pl-10"
        id={id}
    >
        <div className="flex items-center gap-3 mb-6">
            {Icon && <Icon className="size-6 text-primary" />}
            <TextBlockAnimation blockColor="#ff6b00" animateOnScroll={false} trigger={trigger}>
                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight">{title}</h2>
            </TextBlockAnimation>
        </div>
        <div className="prose prose-zinc dark:prose-invert max-w-none text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
            {children}
        </div>
    </motion.section>
);

export default function TermsAndConditions() {
    const lastUpdated = "January 29, 2026";
    const [activeId, setActiveId] = useState("overview");
    const [triggers, setTriggers] = useState<Record<string, number>>({});

    const sections = [
        { id: "overview", label: "Overview" },
        { id: "earning-model", label: "Earning Model" },
        { id: "30s-rule", label: "30s Rule" },
        { id: "rankings", label: "Rankings" },
        { id: "payments", label: "Payments" },
        { id: "prohibited", label: "Prohibited" }
    ];

    const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
        e.preventDefault();
        setActiveId(id);

        // Force force update trigger for the target section
        setTriggers(prev => ({
            ...prev,
            [id]: (prev[id] || 0) + 1
        }));

        const element = document.getElementById(id);
        if (element) {
            const headerOffset = 100;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth"
            });
        }
    };

    return (
        <div className="min-h-screen bg-[#F5F5F3] dark:bg-black text-black dark:text-white font-sans selection:bg-primary selection:text-white">
            {/* Minimalist Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-[#F5F5F3]/80 dark:bg-black/80 backdrop-blur-md border-b border-black/10 dark:border-white/10 px-6 py-4">
                <div className="max-w-5xl mx-auto flex justify-between items-center">
                    <Link href="/">
                        <a className="flex items-center h-full group">
                            <span className="text-2xl font-black tracking-tighter text-black dark:text-white leading-none group-hover:opacity-80 transition-opacity">THORX</span>
                        </a>
                    </Link>
                    <div className="hidden md:block text-[10px] font-bold tracking-[0.2em] uppercase opacity-50">
                        Legal Documentation / Terms of Service
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 pt-32 pb-24">
                <div className="mb-20">
                    <TextBlockAnimation blockColor="#ff6b00" duration={0.8}>
                        <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-none mb-6">
                            Terms <br /> & Conditions<span className="text-primary">.</span>
                        </h1>
                    </TextBlockAnimation>
                    <div className="flex flex-wrap items-center gap-4 text-xs font-bold tracking-widest uppercase opacity-60">
                        <span>Version 2.0</span>
                        <span className="w-1 h-1 bg-black dark:bg-white rounded-full"></span>
                        <span>Last Updated: {lastUpdated}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    {/* Sidebar navigation for desktop */}
                    <aside className="hidden lg:block lg:col-span-3 sticky top-32 h-fit space-y-4">
                        <nav className="flex flex-col space-y-2 border-l border-zinc-200 dark:border-zinc-800">
                            {sections.map((item) => (
                                <a
                                    key={item.id}
                                    href={`#${item.id}`}
                                    onClick={(e) => scrollToSection(e, item.id)}
                                    className={`pl-4 py-2 text-xs font-bold uppercase tracking-widest transition-all duration-300 border-l-2 -ml-[1px] ${activeId === item.id
                                        ? "text-primary border-primary opacity-100"
                                        : "text-zinc-500 border-transparent opacity-50 hover:opacity-100"
                                        }`}
                                >
                                    {item.label}
                                </a>
                            ))}
                        </nav>
                    </aside>

                    <div className="lg:col-span-9">
                        <Section title="1. Platform Overview" id="overview" icon={ShieldCheck} trigger={triggers["overview"]}>
                            <p>
                                THORX (thorx.pro) is an industrial-grade earning platform designed specifically for the Pakistani market.
                                Our mission is to provide a sustainable, transparent, and Halal income opportunity by converting
                                human attention into digital currency (PKR).
                            </p>
                            <p className="mt-4">
                                By registering an account, you agree to participate in an ecosystem where genuine engagement
                                directly correlates with financial reward.
                            </p>
                        </Section>

                        <Section title="2. The Halal Earning Model" id="earning-model" icon={CheckCircle2} trigger={triggers["earning-model"]}>
                            <p>
                                We operate on a strict Halal-based model. All advertisements served through the THORX Ads Player
                                follow guidelines to ensure no prohibited or inappropriate material is promoted.
                            </p>
                            <ul className="list-none space-y-4 mt-6">
                                <li className="flex gap-4">
                                    <span className="font-black text-primary">01</span>
                                    <span>Watching video advertisements attentively via the THORX Ads Player.</span>
                                </li>
                                <li className="flex gap-4">
                                    <span className="font-black text-primary">02</span>
                                    <span>Visiting and interacting with advertiser product pages through the THORX Web Panel.</span>
                                </li>
                                <li className="flex gap-4">
                                    <span className="font-black text-primary">03</span>
                                    <span>Expanding the community via our Multi-Level Referral System.</span>
                                </li>
                            </ul>
                        </Section>

                        <Section title="3. The 30-Second Engagement Rule" id="30s-rule" icon={Scale} trigger={triggers["30s-rule"]}>
                            <div className="bg-zinc-100 dark:bg-zinc-900 p-8 border-l-4 border-primary">
                                <p className="font-bold text-lg mb-4 text-black dark:text-white">Attention is the required stake.</p>
                                <p>
                                    To successfully complete an ad task, users must remain on the advertiser's product page for
                                    <strong> approximately 30 seconds</strong>. This period must involve active reading and scrolling.
                                    Tasks without documented real interaction will not be converted into earnings.
                                </p>
                            </div>
                        </Section>

                        <Section title="4. Ranking & Referrals" id="rankings" icon={Users} trigger={triggers["rankings"]}>
                            <p className="mb-6">
                                THORX utilizes a performance-based ranking system. Upgrading your rank requires meeting
                                both referral count and total earnings thresholds.
                            </p>

                            <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-none mb-8">
                                <table className="w-full text-left text-xs uppercase tracking-tighter">
                                    <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                                        <tr>
                                            <th className="p-4 font-black">Rank</th>
                                            <th className="p-4 font-black">Referrals</th>
                                            <th className="p-4 font-black">Earnings (PKR)</th>
                                            <th className="p-4 font-black">Daily Ads</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                        {[
                                            { r: "Useless", ref: "0", pkr: "0", ads: "50" },
                                            { r: "Worker", ref: "10", pkr: "25k", ads: "75" },
                                            { r: "Soldier", ref: "15", pkr: "35k", ads: "100" },
                                            { r: "Captain", ref: "20", pkr: "50k", ads: "125" },
                                            { r: "General", ref: "25+", pkr: "100k+", ads: "150" },
                                        ].map((row) => (
                                            <tr key={row.r} className="hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">
                                                <td className="p-4 font-bold">{row.r}</td>
                                                <td className="p-4">{row.ref}</td>
                                                <td className="p-4">{row.pkr}</td>
                                                <td className="p-4">{row.ads}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <p className="italic text-sm">
                                Referral Commission: Level 1 (15%) and Level 2 (7.5%) are credited to User A only when the
                                respective payout request from User B/C is processed and approved.
                            </p>
                        </Section>

                        <Section title="5. Payouts & Mandatory Tasks" id="payments" icon={Wallet} trigger={triggers["payments"]}>
                            <p>
                                Payouts are facilitated through <strong>JazzCash</strong> and <strong>EasyPaisa</strong>.
                                To qualify for any withdrawal, users must complete their mandatory daily tasks, which include:
                            </p>
                            <ul className="list-disc pl-5 mt-4 space-y-2">
                                <li>Watching the required number of video ads based on current rank.</li>
                                <li>Watching designated YouTube content for at least 30 seconds.</li>
                                <li>Submitting verification codes from specific media content.</li>
                            </ul>
                        </Section>

                        <Section title="6. Prohibited Actions" id="prohibited" icon={AlertTriangle} trigger={triggers["prohibited"]}>
                            <div className="space-y-6">
                                <div className="p-6 border border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400">
                                    <h4 className="font-black mb-2 uppercase tracking-widest text-sm">Strict Zero-Tolerance</h4>
                                    <p className="text-sm">
                                        The use of bots, headless browsers, or any method to bypass attentive interaction is
                                        strictly prohibited. If our system detects non-attentive engagement, generated earnings
                                        will be categorized as "Haram" and the account will be permanently banned.
                                    </p>
                                </div>
                                <p>
                                    Each user is permitted only one (1) unique Identity. Multiple account creation or
                                    identity manipulation will result in immediate termination of all associated profiles.
                                </p>
                            </div>
                        </Section>

                        <footer className="mt-24 pt-12 border-t border-zinc-200 dark:border-zinc-800 text-[10px] font-bold tracking-[0.3em] uppercase opacity-40">
                            Thorx Official Legal / Powered by Thorx.pro
                        </footer>
                    </div>
                </div>
            </main>
        </div>
    );
}
