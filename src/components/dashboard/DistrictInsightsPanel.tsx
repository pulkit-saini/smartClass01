import { Card } from "../common/Card";
import { SimpleBarChart } from "../charts/SimpleBarChart";
import { computeStateSummary } from "../../utils/analytics";
import type { District } from "../../types/domain";

interface DistrictInsightsPanelProps {
  district: District;
}

export const DistrictInsightsPanel = ({ district }: DistrictInsightsPanelProps) => {
  const blockRows = district.blocks.map((block) => {
    const summary = computeStateSummary(block.schools);
    return {
      blockId: block.id,
      blockName: block.name,
      totalSchools: summary.totalSchools,
      online: summary.online,
      offline: summary.offline + summary.inactive,
      avgHealth: summary.avgHealthScore
    };
  });

  const districtSchools = district.blocks.flatMap((block) => block.schools);
  const districtSummary = computeStateSummary(districtSchools);

  const healthChartData = blockRows.map((row) => ({
    label: row.blockName,
    value: row.avgHealth
  }));

  const atRiskSchools = districtSchools
    .slice()
    .sort((a, b) => a.infrastructure.healthScore - b.infrastructure.healthScore)
    .slice(0, 4);

  return (
    <Card
      title="District Intelligence Board"
      subtitle="Block-wise performance, connectivity risk and school-level attention list"
    >
      <div className="kpi-grid">
        <div>
          <span>Total Blocks</span>
          <strong>{district.blocks.length}</strong>
        </div>
        <div>
          <span>Total Schools</span>
          <strong>{districtSummary.totalSchools}</strong>
        </div>
        <div>
          <span>Schools Online</span>
          <strong>{districtSummary.online}</strong>
        </div>
        <div>
          <span>Average Infra Health</span>
          <strong>{districtSummary.avgHealthScore}%</strong>
        </div>
      </div>

      <div className="module-grid module-2">
        <div>
          <h4>Block Health Comparison</h4>
          <SimpleBarChart data={healthChartData} color="#2f6fed" />
        </div>
        <div>
          <h4>Block Operations Snapshot</h4>
          <table>
            <thead>
              <tr>
                <th>Block</th>
                <th>Schools</th>
                <th>Online</th>
                <th>Offline/Inactive</th>
                <th>Avg Health</th>
              </tr>
            </thead>
            <tbody>
              {blockRows.map((row) => (
                <tr key={row.blockId}>
                  <td>{row.blockName}</td>
                  <td>{row.totalSchools}</td>
                  <td>{row.online}</td>
                  <td>{row.offline}</td>
                  <td>{row.avgHealth}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h4>Priority Schools For Review</h4>
        <ul className="log-list">
          {atRiskSchools.map((school) => (
            <li key={school.id}>
              <strong>{school.geoIdentity.schoolName}</strong> - {school.geoIdentity.block} (
              {school.infrastructure.healthScore}% health)
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
};
