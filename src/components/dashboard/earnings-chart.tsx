import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function EarningsChart({ data }: { data: { day: string; earned: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.82 0.17 85)" stopOpacity={0.6} />
            <stop offset="100%" stopColor="oklch(0.82 0.17 85)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="day" stroke="oklch(0.7 0.03 255)" fontSize={12} />
        <YAxis stroke="oklch(0.7 0.03 255)" fontSize={12} />
        <Tooltip contentStyle={{ background: "oklch(0.2 0.04 265)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 12 }} />
        <Area type="monotone" dataKey="earned" stroke="oklch(0.82 0.17 85)" strokeWidth={2} fill="url(#g)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}