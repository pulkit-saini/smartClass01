import { Card } from "../common/Card";
import type { School } from "../../types/domain";
import { SimpleBarChart } from "../charts/SimpleBarChart";
import { SimpleLineChart } from "../charts/SimpleLineChart";

interface UserActivityPanelProps {
  school: School;
}

export const UserActivityPanel = ({ school }: UserActivityPanelProps) => {
  const activity = school.userActivity;

  return (
    <Card title="User Activity Monitoring" subtitle="Operator behavior, logins and session insights">
      <div className="module-grid module-3">
        <div>
          <h4>Login Frequency (Weekly)</h4>
          <SimpleBarChart data={activity.loginFrequencyWeekly} color="#006d77" />
        </div>
        <div>
          <h4>Session Duration (Minutes)</h4>
          <SimpleLineChart data={activity.sessionDurationMinutes} color="#e85d04" />
        </div>
        <div>
          <div className="kpi-grid">
            <div>
              <span>Active Operators</span>
              <strong>{activity.activeOperators}</strong>
            </div>
            <div>
              <span>Inactive Schools Detected</span>
              <strong>{activity.inactiveSchoolsDetected}</strong>
            </div>
          </div>
          <p className="summary-text">{activity.behaviorSummary}</p>
        </div>
      </div>
    </Card>
  );
};
