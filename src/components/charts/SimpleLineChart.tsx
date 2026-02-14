import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { TimeSeriesPoint, TimelinePoint } from "../../types/domain";

type ChartData = TimeSeriesPoint[] | TimelinePoint[];

interface SimpleLineChartProps {
  data: ChartData;
  xKey?: "label" | "slot";
  yKey?: "value" | "active";
  color?: string;
}

export const SimpleLineChart = ({
  data,
  xKey = "label",
  yKey = "value",
  color = "#006d77"
}: SimpleLineChartProps) => {
  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
          <XAxis dataKey={xKey} stroke="var(--text-muted)" />
          <YAxis stroke="var(--text-muted)" />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--stroke)",
              borderRadius: 12
            }}
          />
          <Line type="monotone" dataKey={yKey} stroke={color} strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
