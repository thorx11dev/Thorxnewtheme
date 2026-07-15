/**
 * RanksCustomizer — THORX v3 (spec F.16)
 * Admin tool to configure PS thresholds, engine splits, and rank labels.
 * PATCH /api/admin/config/:key for each setting.
 * Uses E-Rank, D-Rank, C-Rank, B-Rank, A-Rank, S-Rank labels — never old Urdu names.
 */
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RankBadge } from "@/components/RankBadge";
import { Save, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const RANKS = ["E-Rank", "D-Rank", "C-Rank", "B-Rank", "A-Rank", "S-Rank"];

const PS_THRESHOLD_DEFAULTS: Record<string, number> = {
  "PS_THRESHOLD_E": 0,
  "PS_THRESHOLD_D": 1000,
  "PS_THRESHOLD_C": 3000,
  "PS_THRESHOLD_B": 6000,
  "PS_THRESHOLD_A": 10000,
  "PS_THRESHOLD_S": 20000,
};

const ENGINE_SPLIT_DEFAULTS: Record<string, number> = {
  "ENGINE_A_USER_SPLIT": 0.60,  // 60% to user
  "ENGINE_B_USER_SPLIT": 0.45,  // 45% to user (Engine B CPA: 40/60 in spec — user keeps 45%)
  "ENGINE_C_MEMBER_SPLIT": 0.70,  // 70% to members, 30% to captain
  "ENGINE_C_CAPTAIN_SPLIT": 0.30,
};

const VARIANCE_DEFAULTS: Record<string, number> = {
  "CARD_VARIANCE_PCT": 0.25,   // ±25% default variance on TX-Point card draw
  "CARD_VARIANCE_A_RANK": 0.30,  // A-Rank gets ±30%
  "CARD_VARIANCE_S_RANK": 0.35,  // S-Rank gets ±35%
};

const PS_AWARD_DEFAULTS: Record<string, number> = {
  "PS_PER_ENGINE_A_EVENT": 5,
  "PS_PER_ENGINE_B_EVENT": 15,
  "PS_PER_INDIRECT_TASK": 15,
  "PS_STREAK_DAY_1": 5,
  "PS_STREAK_DAY_2": 10,
  "PS_STREAK_3PLUS": 20,
  "PS_INACTIVITY_PENALTY": 10,
};

type Section = "thresholds" | "splits" | "variance" | "ps_awards";

function useAdminConfigs(keys: string[]) {
  return useQuery<Record<string, any>>({
    queryKey: ["/api/admin/config"],
    queryFn: async () => {
      const r = await apiRequest("GET", "/api/admin/config");
      const d = await r.json();
      const configs: Record<string, any> = {};
      (d.configs ?? []).forEach((c: any) => { configs[c.key] = c.value; });
      return configs;
    },
  });
}

function ConfigRow({
  label, configKey, defaultVal, description, suffix = "",
  dbConfigs, onChange, onSave, saving,
}: {
  label: string; configKey: string; defaultVal: number; description?: string; suffix?: string;
  dbConfigs: Record<string, any>; onChange: (k: string, v: string) => void; onSave: (k: string) => void; saving: string | null;
}) {
  const storedRaw = dbConfigs[configKey];
  const displayVal = storedRaw !== undefined
    ? (typeof storedRaw === "object" ? storedRaw.value : storedRaw) : defaultVal;

  const [local, setLocal] = useState(String(displayVal));

  useEffect(() => {
    setLocal(String(displayVal));
  }, [displayVal]);

  const isDirty = parseFloat(local) !== parseFloat(String(displayVal));

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-zinc-100 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-zinc-800">{label}</div>
        {description && <div className="text-[11px] text-zinc-400 mt-0.5">{description}</div>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Input
          type="number"
          value={local}
          onChange={e => { setLocal(e.target.value); onChange(configKey, e.target.value); }}
          className="h-7 w-24 text-sm text-right"
        />
        {suffix && <span className="text-xs text-zinc-400">{suffix}</span>}
        <Button
          size="sm"
          className="h-7 w-7 p-0"
          disabled={!isDirty || saving === configKey}
          onClick={() => onSave(configKey)}
        >
          <Save size={12} />
        </Button>
      </div>
    </div>
  );
}

export function RanksCustomizer() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<Section>("thresholds");
  const [localEdits, setLocalEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const { data: dbConfigs = {}, refetch } = useAdminConfigs([]);

  const saveMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const r = await apiRequest("PATCH", `/api/admin/config/${key}`, { value });
      return r.json();
    },
    onSuccess: (_, { key }) => {
      toast({ title: "Saved", description: `${key} updated.` });
      setSaving(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/config"] });
    },
    onError: (_, { key }) => {
      setSaving(null);
      toast({ title: "Save failed", variant: "destructive" });
    },
  });

  const handleChange = (key: string, val: string) => {
    setLocalEdits(prev => ({ ...prev, [key]: val }));
  };

  const handleSave = (key: string) => {
    const raw = localEdits[key];
    if (raw === undefined) return;
    const parsed = parseFloat(raw);
    if (isNaN(parsed)) { toast({ title: "Invalid value", variant: "destructive" }); return; }
    setSaving(key);
    saveMutation.mutate({ key, value: parsed });
  };

  const commonProps = { dbConfigs, onChange: handleChange, onSave: handleSave, saving };

  const SECTIONS: { id: Section; label: string }[] = [
    { id: "thresholds", label: "PS Thresholds" },
    { id: "splits",     label: "Engine Splits" },
    { id: "variance",   label: "Card Variance" },
    { id: "ps_awards",  label: "PS Awards" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black">Ranks & Engine Config</h2>
          <p className="text-sm text-zinc-500 mt-0.5">Fine-tune PS thresholds, engine splits, and TX-Point card variance.</p>
        </div>
        <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => refetch()} title="Refresh">
          <RefreshCw size={14} />
        </Button>
      </div>

      {/* Rank Tier overview */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="text-sm font-bold mb-3">Rank Tier System</div>
        <div className="flex flex-wrap gap-2">
          {RANKS.map((r, i) => {
            const psKey = `PS_THRESHOLD_${r.split("-")[0]}`;
            const threshold = dbConfigs[psKey]?.value ?? PS_THRESHOLD_DEFAULTS[psKey] ?? 0;
            return (
              <div key={r} className="rounded-lg border border-zinc-200 px-3 py-2 text-center min-w-[80px]">
                <RankBadge rank={r} size="sm" className="mb-1" />
                <div className="text-xs text-zinc-500">{threshold.toLocaleString()}+ PS</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section selector */}
      <div className="flex gap-1 bg-zinc-100 rounded-lg p-1 overflow-x-auto">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            className={cn("flex-shrink-0 text-xs font-semibold py-1.5 px-3 rounded-md transition-all",
              activeSection === s.id ? "bg-white shadow text-zinc-900" : "text-zinc-500 hover:text-zinc-700")}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        {activeSection === "thresholds" && (
          <div>
            <div className="text-xs text-zinc-500 mb-3">Minimum PS required to reach each rank tier. Server-enforced by ps-engine.ts.</div>
            {RANKS.map(rank => {
              const letter = rank.split("-")[0];
              const configKey = `PS_THRESHOLD_${letter}`;
              return <ConfigRow key={configKey} label={rank} configKey={configKey}
                defaultVal={PS_THRESHOLD_DEFAULTS[configKey] ?? 0}
                description={`Min PS for ${rank} tier`} suffix="PS" {...commonProps} />;
            })}
          </div>
        )}

        {activeSection === "splits" && (
          <div>
            <div className="text-xs text-zinc-500 mb-3">Engine earn split ratios. Must sum to 1.0 within each engine.</div>
            {Object.entries(ENGINE_SPLIT_DEFAULTS).map(([key, def]) => (
              <ConfigRow key={key} label={key.replace(/_/g, " ")} configKey={key}
                defaultVal={def} suffix="(0–1)" description="Fraction of gross PKR credited to user/role" {...commonProps} />
            ))}
          </div>
        )}

        {activeSection === "variance" && (
          <div>
            <div className="text-xs text-zinc-500 mb-3">TX-Point card variance per rank. Range: [1−v, 1+v] × base points.</div>
            {Object.entries(VARIANCE_DEFAULTS).map(([key, def]) => (
              <ConfigRow key={key} label={key.replace(/_/g, " ")} configKey={key}
                defaultVal={def} suffix="(0–1)" description="e.g. 0.25 = ±25% variance on card draw" {...commonProps} />
            ))}
          </div>
        )}

        {activeSection === "ps_awards" && (
          <div>
            <div className="text-xs text-zinc-500 mb-3">PS points awarded per event type.</div>
            {Object.entries(PS_AWARD_DEFAULTS).map(([key, def]) => (
              <ConfigRow key={key} label={key.replace(/_/g, " ")} configKey={key}
                defaultVal={def} suffix="PS" {...commonProps} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default RanksCustomizer;
