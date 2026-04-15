import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { BarChart2, TrendingUp } from 'lucide-react';

const placeholderData = [
  { name: 'A1', score: 0 },
  { name: 'A2', score: 0 },
  { name: 'A3', score: 0 },
];

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-overlay/[0.08] rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-text-muted mb-1 font-medium">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-overlay/60" />
          <span className="text-text-muted">{p.name}:</span>
          <span className="text-text-primary font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export function StudentPerformanceChart({ type = "individual", data = [] }) {
  if (type === 'class') {
    const hasData = data && data.length > 0;
    return (
      <Card className="h-[400px] border-none shadow-soft bg-surface">
        <CardHeader className="pb-1 border-b border-overlay/[0.05]">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-text-primary">Class Performance Overview</CardTitle>
              <p className="text-xs text-text-muted mt-0.5">Avg vs top score per assignment</p>
            </div>
            {hasData && (
              <div className="flex items-center gap-3 text-xs text-text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm inline-block" style={{ background: 'rgba(255,255,255,0.35)' }} />Avg
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm inline-block" style={{ background: 'rgba(255,255,255,0.85)' }} />Top
                </span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="h-[300px] pt-4">
          {!hasData ? (
            <div className="h-full flex flex-col items-center justify-center gap-2">
              <div className="flex items-end gap-1.5 opacity-15">
                {[40, 65, 50, 80, 55].map((h, i) => (
                  <div key={i} className="w-6 bg-white rounded-t-sm" style={{ height: `${h}px` }} />
                ))}
              </div>
              <BarChart2 className="h-8 w-8 text-text-muted opacity-20 mt-2" />
              <p className="text-xs text-text-muted mt-1">No graded assignments yet</p>
              <p className="text-xs text-text-muted opacity-60">Charts appear after results are published</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} barGap={3} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="avg" fill="rgba(255,255,255,0.35)" name="Average" radius={[3, 3, 0, 0]} />
                <Bar dataKey="top" fill="rgba(255,255,255,0.85)" name="Top" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    );
  }

  // Student individual progress view (area chart)
  const hasRealData = data && data.length > 0;
  const chartData = hasRealData ? data : placeholderData;

  return (
    <Card className="h-[350px] border-none shadow-soft bg-surface">
      <CardHeader className="pb-2 border-b border-overlay/[0.05]">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-text-muted" />
          <CardTitle className="text-sm font-semibold text-text-primary">Your Progress</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="h-[265px] w-full relative pt-4">
        {!hasRealData && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-surface/80 backdrop-blur-sm rounded-b-2xl">
            <div className="text-center px-4">
              <p className="text-xs text-text-muted">No results published yet</p>
              <p className="text-xs text-text-muted opacity-60 mt-1">Scores appear here after grading</p>
            </div>
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="rgba(255,255,255,1)" stopOpacity={0.12} />
                <stop offset="95%" stopColor="rgba(255,255,255,1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="score"
              stroke="rgba(255,255,255,0.5)"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#colorScore)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
