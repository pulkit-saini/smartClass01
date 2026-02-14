import { Card } from "../common/Card";
import type { School } from "../../types/domain";
import { SimpleBarChart } from "../charts/SimpleBarChart";
import { SimpleLineChart } from "../charts/SimpleLineChart";
import { StatusPill } from "../common/StatusPill";
import { formatDateTime } from "../../utils/analytics";

interface DeviceAnalyticsPanelProps {
  school: School;
}

const healthColor = (health: "HEALTHY" | "WARNING" | "CRITICAL") => {
  if (health === "HEALTHY") {
    return "GREEN";
  }
  if (health === "WARNING") {
    return "YELLOW";
  }
  return "RED";
};

export const DeviceAnalyticsPanel = ({ school }: DeviceAnalyticsPanelProps) => {
  const analytics = school.deviceAnalytics;

  return (
    <Card title="Device Monitoring & Analytics" subtitle="IFPD/AIO panel activity and reliability tracking">
      <div className="kpi-grid">
        <div>
          <span>Daily Usage</span>
          <strong>{analytics.dailyUsageHours}h</strong>
        </div>
        <div>
          <span>Active Time</span>
          <strong>{analytics.activeHours}h</strong>
        </div>
        <div>
          <span>Idle Time</span>
          <strong>{analytics.idleHours}h</strong>
        </div>
        <div>
          <span>Offline Duration</span>
          <strong>{analytics.offlineDurationHours}h</strong>
        </div>
        <div>
          <span>Device Health</span>
          <StatusPill text={analytics.deviceHealth} color={healthColor(analytics.deviceHealth)} />
        </div>
        <div>
          <span>Last Restart</span>
          <strong>{formatDateTime(analytics.lastRestart)}</strong>
        </div>
      </div>
      <div className="module-grid module-3">
        <div>
          <h4>Weekly Usage (Hours)</h4>
          <SimpleBarChart data={analytics.weeklyUsage} />
        </div>
        <div>
          <h4>Monthly Trend (Hours)</h4>
          <SimpleLineChart data={analytics.monthlyUsage} />
        </div>
        <div>
          <h4>ON/OFF Timeline</h4>
          <SimpleLineChart data={analytics.onOffTimeline} xKey="slot" yKey="active" color="#f3a712" />
        </div>
      </div>
      <div>
        <h4>Error Logs</h4>
        <ul className="log-list">
          {analytics.errorLogs.map((log) => (
            <li key={log}>{log}</li>
          ))}
        </ul>
      </div>
    </Card>
  );
};
