import { Card } from "../common/Card";
import { StatusPill } from "../common/StatusPill";

interface FilterOption {
  id: string;
  name: string;
}

interface HierarchySummary {
  totalSchools: number;
  online: number;
  offline: number;
  inactive: number;
  avgHealthScore: number;
}

interface HierarchyFiltersProps {
  districts: FilterOption[];
  blocks: FilterOption[];
  schools: FilterOption[];
  selectedDistrict: string;
  selectedBlock: string;
  selectedSchool: string;
  onDistrictChange: (value: string) => void;
  onBlockChange: (value: string) => void;
  onSchoolChange: (value: string) => void;
  summary: HierarchySummary;
}

export const HierarchyFilters = ({
  districts,
  blocks,
  schools,
  selectedDistrict,
  selectedBlock,
  selectedSchool,
  onDistrictChange,
  onBlockChange,
  onSchoolChange,
  summary
}: HierarchyFiltersProps) => {
  return (
    <Card title="Governance Drill-Down" subtitle="State → District → Block → School">
      <div className="filter-grid">
        <label>
          District
          <select value={selectedDistrict} onChange={(event) => onDistrictChange(event.target.value)}>
            {districts.map((district) => (
              <option key={district.id} value={district.id}>
                {district.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Block
          <select value={selectedBlock} onChange={(event) => onBlockChange(event.target.value)}>
            {blocks.map((block) => (
              <option key={block.id} value={block.id}>
                {block.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          School
          <select value={selectedSchool} onChange={(event) => onSchoolChange(event.target.value)}>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="summary-grid">
        <div className="summary-item">
          <span className="summary-label">Total Schools</span>
          <strong>{summary.totalSchools}</strong>
        </div>
        <div className="summary-item">
          <span className="summary-label">Online</span>
          <strong>{summary.online}</strong>
          <StatusPill text="Healthy" color="GREEN" />
        </div>
        <div className="summary-item">
          <span className="summary-label">Offline</span>
          <strong>{summary.offline}</strong>
          <StatusPill text="At Risk" color="YELLOW" />
        </div>
        <div className="summary-item">
          <span className="summary-label">Inactive</span>
          <strong>{summary.inactive}</strong>
          <StatusPill text="Critical" color="RED" />
        </div>
        <div className="summary-item">
          <span className="summary-label">Avg Infra Health</span>
          <strong>{summary.avgHealthScore}%</strong>
        </div>
      </div>
    </Card>
  );
};
