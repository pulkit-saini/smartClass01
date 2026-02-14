import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { AppUsageSlice } from "../../types/domain";

const COLORS = ["#2f6fed", "#1e8f4e", "#f3a712", "#d17a22", "#9b8f6f"];

interface SimplePieChartProps {
  data: AppUsageSlice[];
}

export const SimplePieChart = ({ data }: SimplePieChartProps) => {
  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="minutes"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={84}
            innerRadius={48}
            paddingAngle={2}
          >
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--stroke)",
              borderRadius: 12
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
