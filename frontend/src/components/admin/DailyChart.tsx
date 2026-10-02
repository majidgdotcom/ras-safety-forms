import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { DailyCountDto } from '@ras/shared';

import { formatDay, formatShortDay } from '@/utils/format';

const BAR = '#1f7a55'; // brand green, lightened so it reads clearly as a data mark

/** Submissions per day (last 14 days). Single series -> no legend; the title names it. */
export const DailyChart: React.FC<{ data: DailyCountDto[] }> = ({ data }) => {
  const rows = data.map((d) => ({ ...d, label: formatShortDay(d.date) }));
  const last = rows.length - 1;

  return (
    <div style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ top: 20, right: 8, left: -20, bottom: 0 }} barCategoryGap="25%">
          <CartesianGrid vertical={false} stroke="#ecebe9" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: '#dedbd8' }}
            tick={{ fontSize: 12, fill: '#6b6768' }}
            interval="preserveStartEnd"
          />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#6b6768' }} />
          <Tooltip
            cursor={{ fill: 'rgba(4,83,57,0.06)' }}
            formatter={(v: number) => [v, 'Forms submitted']}
            labelFormatter={(_, payload) => (payload?.[0] ? formatDay(payload[0].payload.date) : '')}
          />
          <Bar dataKey="submissions" fill={BAR} radius={[4, 4, 0, 0]} maxBarSize={28}>
            {/* Only label the latest day, not every bar */}
            <LabelList
              dataKey="submissions"
              position="top"
              content={({ x, y, width, value, index }) =>
                index === last ? (
                  <text
                    x={Number(x) + Number(width) / 2}
                    y={Number(y) - 6}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={700}
                    fill="#1f1d1e"
                  >
                    {value}
                  </text>
                ) : null
              }
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
