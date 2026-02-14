import { Card } from "../common/Card";
import { StatusPill } from "../common/StatusPill";
import type { Block, SchoolConnectionStatus } from "../../types/domain";
import { computeStateSummary } from "../../utils/analytics";
import { SimpleBarChart } from "../charts/SimpleBarChart";

interface BlockOperationsPanelProps {
  districtName: string;
  block: Block;
}

const statusColor = (status: SchoolConnectionStatus): "GREEN" | "YELLOW" | "RED" => {
  if (status === "ONLINE") {
    return "GREEN";
  }
  if (status === "OFFLINE") {
    return "YELLOW";
  }
  return "RED";
};

export const BlockOperationsPanel = ({ districtName, block }: BlockOperationsPanelProps) => {
  const blockSummary = computeStateSummary(block.schools);
  const schoolHealthData = block.schools.map((school) => ({
    label: school.geoIdentity.schoolName,
    value: school.infrastructure.healthScore
  }));

  const escalationQueue = block.schools
    .slice()
    .sort((a, b) => a.infrastructure.healthScore - b.infrastructure.healthScore)
    .slice(0, 3);

  return (
    <Card
      title="Block Operations Control"
      subtitle={`Execution-focused dashboard for ${block.name}, ${districtName}`}
    >
      <div className="kpi-grid">
        <div>
          <span>Schools In Block</span>
          <strong>{blockSummary.totalSchools}</strong>
        </div>
        <div>
          <span>Online</span>
          <strong>{blockSummary.online}</strong>
        </div>
        <div>
          <span>Offline/Inactive</span>
          <strong>{blockSummary.offline + blockSummary.inactive}</strong>
        </div>
        <div>
          <span>Average Health</span>
          <strong>{blockSummary.avgHealthScore}%</strong>
        </div>
      </div>

      <div className="module-grid module-2">
        <div>
          <h4>School Health Index</h4>
          <SimpleBarChart data={schoolHealthData} color="#006d77" />
        </div>
        <div>
          <h4>School Connectivity Watch</h4>
          <table>
            <thead>
              <tr>
                <th>School</th>
                <th>Status</th>
                <th>Health</th>
              </tr>
            </thead>
            <tbody>
              {block.schools.map((school) => (
                <tr key={school.id}>
                  <td>{school.geoIdentity.schoolName}</td>
                  <td>
                    <StatusPill
                      text={school.geoIdentity.internetStatus}
                      color={statusColor(school.geoIdentity.internetStatus)}
                    />
                  </td>
                  <td>{school.infrastructure.healthScore}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h4>Escalation Queue</h4>
        <ul className="log-list">
          {escalationQueue.map((school) => (
            <li key={school.id}>
              {school.geoIdentity.schoolName}: {school.infrastructure.healthScore}% health,{" "}
              {school.deviceAnalytics.deviceHealth} device state
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
};
