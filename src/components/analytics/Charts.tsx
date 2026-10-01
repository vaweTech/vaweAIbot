"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

function ChartEmpty() {
  return (
    <div className="flex h-72 w-full items-center justify-center rounded-xl border border-dashed border-border bg-slate-50/60 px-6 text-center text-sm text-muted">
      No data yet. This chart fills in once students complete assessments.
    </div>
  );
}

interface PerformanceChartProps {
  data: { month: string; interviews: number; gdSessions: number; speakingTests: number }[];
}

export function PerformanceChart({ data }: PerformanceChartProps) {
  if (data.length === 0) return <ChartEmpty />;
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
          <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="interviews" name="Interviews" stroke="#4f46e5" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="gdSessions" name="GD Sessions" stroke="#0ea5e9" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="speakingTests" name="Speaking Tests" stroke="#10b981" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface SkillChartProps {
  data: { skill: string; score: number }[];
  color?: string;
}

export function SkillChart({ data, color = "#4f46e5" }: SkillChartProps) {
  if (data.length === 0) return <ChartEmpty />;
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#94a3b8" />
          <YAxis type="category" dataKey="skill" width={120} tick={{ fontSize: 11 }} stroke="#94a3b8" />
          <Tooltip />
          <Bar dataKey="score" fill={color} radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface ScoreDistributionProps {
  data: { label: string; value: number; color: string }[];
}

export function ScoreDistribution({ data }: ScoreDistributionProps) {
  if (data.length === 0) return <ChartEmpty />;
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={3}
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

interface ProgressChartProps {
  data: Record<string, string | number>[];
  lines: { key: string; color: string; name: string }[];
  xKey?: string;
}

export function ProgressChart({ data, lines, xKey = "month" }: ProgressChartProps) {
  if (data.length === 0) return <ChartEmpty />;
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey={xKey} tick={{ fontSize: 12 }} stroke="#94a3b8" />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#94a3b8" />
          <Tooltip />
          <Legend />
          {lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.name}
              stroke={line.color}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
