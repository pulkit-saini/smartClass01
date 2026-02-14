import { Card } from "../common/Card";
import { computeStateSummary } from "../../utils/analytics";
import type { School } from "../../types/domain";
import { SimpleBarChart } from "../charts/SimpleBarChart";

interface ViewerInsightsPanelProps {
  schools: School[];
  title?: string;
  subtitle?: string;
  readOnly?: boolean;
  modeLabel?: string;
}

export const ViewerInsightsPanel = ({
  schools,
  title = "Monitoring Analytics Snapshot",
  subtitle = "Role-scoped visibility for monitoring insights and trend observation",
  readOnly = true,
  modeLabel = "Viewer"
}: ViewerInsightsPanelProps) => {
  const summary = computeStateSummary(schools);
  const bestSchool = schools
    .slice()
    .sort((a, b) => b.infrastructure.healthScore - a.infrastructure.healthScore)[0];
  const riskSchool = schools
    .slice()
    .sort((a, b) => a.infrastructure.healthScore - b.infrastructure.healthScore)[0];

  const comparisonData = schools.slice(0, 6).map((school) => ({
    label: school.geoIdentity.schoolName,
    value: school.infrastructure.healthScore
  }));

  return (
    <Card title={title} subtitle={subtitle}>
      {readOnly ? (
        <div className="readonly-banner">
          {modeLabel} mode is read-only. You can inspect data but cannot trigger operational actions.
        </div>
      ) : null}
      <div className="kpi-grid">
        <div>
          <span>Visible Schools</span>
          <strong>{summary.totalSchools}</strong>
        </div>
        <div>
          <span>Online</span>
          <strong>{summary.online}</strong>
        </div>
        <div>
          <span>Offline/Inactive</span>
          <strong>{summary.offline + summary.inactive}</strong>
        </div>
        <div>
          <span>Average Health</span>
          <strong>{summary.avgHealthScore}%</strong>
        </div>
      </div>

      <div className="module-grid module-2">
        <div>
          <h4>School Health Comparison</h4>
          <SimpleBarChart data={comparisonData} color="#1e8f4e" />
        </div>
        <div>
          <h4>Observation Notes</h4>
          <ul className="log-list">
            {bestSchool ? (
              <li>
                Best performing school: <strong>{bestSchool.geoIdentity.schoolName}</strong> (
                {bestSchool.infrastructure.healthScore}% health).
              </li>
            ) : null}
            {riskSchool ? (
              <li>
                Needs attention: <strong>{riskSchool.geoIdentity.schoolName}</strong> (
                {riskSchool.infrastructure.healthScore}% health).
              </li>
            ) : null}
            <li>Use district/block filters to inspect local trends before review meetings.</li>
          </ul>
        </div>
      </div>
    </Card>
  );
};
