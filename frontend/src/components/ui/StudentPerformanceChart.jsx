import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, LineChart, Line, ReferenceLine } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { BarChart2, TrendingUp } from 'lucide-react';

// Placeholder data for "no results" state - shows a flat 0 line
const placeholderData = [
  { name: 'A1', score: 0 },
  { name: 'A2', score: 0 },
  { name: 'A3', score: 0 },
];

export function StudentPerformanceChart({ type = "individual", data = [] }) {
  if (type === 'class') {
    // If no data, show placeholder
    if (!data || data.length === 0) {
      return (
        <Card className="h-[400px] border-none shadow-soft bg-surface">
          <CardHeader>
            <CardTitle className="text-text-primary">Class Performance Overview</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px] w-full flex items-center justify-center">
            <div className="text-center">
              <BarChart2 className="h-16 w-16 mx-auto text-text-muted opacity-30 mb-4" />
              <p className="text-text-muted">No performance data available yet.</p>
              <p className="text-xs text-text-muted mt-1">Charts will appear after assignments are graded.</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="h-[400px] border-none shadow-soft bg-surface">
        <CardHeader>
          <CardTitle className="text-text-primary">Class Performance Overview</CardTitle>
        </CardHeader>
        <CardContent className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
              <XAxis dataKey="name" tick={{ fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', borderRadius: '8px', border: '1px solid #374151', color: '#fff' }}
                labelStyle={{ color: '#9CA3AF' }}
                itemStyle={{ color: '#fff' }}
                cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
              />
              <Legend
                wrapperStyle={{ paddingTop: '10px' }}
                formatter={(value) => <span style={{ color: '#9CA3AF' }}>{value}</span>}
              />
              <Bar dataKey="avg" fill="#6366F1" name="Average Score" radius={[4, 4, 0, 0]} />
              <Bar dataKey="top" fill="#38BDF8" name="Top Score" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  }

  // Student individual view
  const hasRealData = data && data.length > 0;
  const chartData = hasRealData ? data : placeholderData;

  return (
    <Card className="h-[350px] border-none shadow-soft bg-surface">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <CardTitle className="text-text-primary text-base">Your Progress</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="h-[280px] w-full relative">
        {!hasRealData && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-surface/80 backdrop-blur-sm rounded-lg">
            <div className="text-center px-4">
              <p className="text-text-muted text-sm">No results published yet</p>
              <p className="text-xs text-text-muted mt-1">Your scores will appear here after grading</p>
            </div>
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
            <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
            <ReferenceLine y={0} stroke="#4B5563" strokeDasharray="3 3" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1F2937', borderRadius: '8px', border: 'none', color: '#fff' }}
              labelStyle={{ color: '#9CA3AF' }}
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke="#6366F1"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorScore)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
