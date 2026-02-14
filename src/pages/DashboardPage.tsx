import { useEffect, useMemo, useState } from "react";
import { HierarchyFilters } from "../components/dashboard/HierarchyFilters";
import { GeoIdentityPanel } from "../components/dashboard/GeoIdentityPanel";
import { InfrastructurePanel } from "../components/dashboard/InfrastructurePanel";
import { DeviceAnalyticsPanel } from "../components/dashboard/DeviceAnalyticsPanel";
import { AppUsagePanel } from "../components/dashboard/AppUsagePanel";
import { CommunicationHubPanel } from "../components/dashboard/CommunicationHubPanel";
import { UserActivityPanel } from "../components/dashboard/UserActivityPanel";
import { CommandCenterPanel } from "../components/dashboard/CommandCenterPanel";
import { DistrictInsightsPanel } from "../components/dashboard/DistrictInsightsPanel";
import { BlockOperationsPanel } from "../components/dashboard/BlockOperationsPanel";
import { ViewerInsightsPanel } from "../components/dashboard/ViewerInsightsPanel";
import { DirectorHeroAnalyticsPanel } from "../components/dashboard/DirectorHeroAnalyticsPanel";
import { allSchools, commandAlerts, stateEducationData } from "../data/mockData";
import { computeStateSummary } from "../utils/analytics";
import { useAuth } from "../auth/AuthContext";

export const DashboardPage = () => {
  const { user } = useAuth();
  const role = user?.role ?? "VIEWER";
  const [selectedDistrict, setSelectedDistrict] = useState(stateEducationData.districts[0]?.id ?? "");
  const [selectedBlock, setSelectedBlock] = useState("");
  const [selectedSchool, setSelectedSchool] = useState("");

  const district = useMemo(
    () => stateEducationData.districts.find((item) => item.id === selectedDistrict),
    [selectedDistrict]
  );

  const districtSchools = useMemo(
    () => district?.blocks.flatMap((block) => block.schools) ?? [],
    [district]
  );

  useEffect(() => {
    const nextBlock = district?.blocks[0]?.id ?? "";
    setSelectedBlock(nextBlock);
  }, [district?.id, district?.blocks]);

  const block = useMemo(
    () => district?.blocks.find((item) => item.id === selectedBlock),
    [district?.blocks, selectedBlock]
  );

  useEffect(() => {
    const nextSchool = block?.schools[0]?.id ?? "";
    setSelectedSchool(nextSchool);
  }, [block?.id, block?.schools]);

  const school = useMemo(
    () => block?.schools.find((item) => item.id === selectedSchool) ?? block?.schools[0],
    [block?.schools, selectedSchool]
  );

  if (!district || !block || !school) {
    return <p>Dashboard data unavailable.</p>;
  }

  const districtSummary = computeStateSummary(districtSchools);
  const blockSummary = computeStateSummary(block.schools);
  const schoolSummary = computeStateSummary([school]);
  const districtAlerts = commandAlerts.filter((alert) => alert.district === district.name);
  const blockSchoolIds = new Set(block.schools.map((item) => item.id));
  const blockAlerts = commandAlerts.filter((alert) => blockSchoolIds.has(alert.schoolId));
  const schoolAlerts = commandAlerts.filter((alert) => alert.schoolId === school.id);

  const scopedSchools =
    role === "ADMIN"
      ? allSchools
      : role === "DISTRICT_OFFICER"
        ? districtSchools
        : role === "BLOCK_OFFICER" || role === "VIEWER"
          ? block.schools
          : [school];

  const scopedAlerts =
    role === "ADMIN"
      ? commandAlerts
      : role === "DISTRICT_OFFICER"
        ? districtAlerts
        : role === "BLOCK_OFFICER" || role === "VIEWER"
          ? blockAlerts
          : schoolAlerts;

  const isReadOnly = role === "VIEWER";

  return (
    <div className="dashboard-stack">
      <header className="dashboard-gov-header">
        <p className="dashboard-gov-kicker">Government of Uttarakhand</p>
        <h2>ICT Monitoring &amp; Command Dashboard</h2>
      </header>

      {role === "ADMIN" ? <DirectorHeroAnalyticsPanel schools={allSchools} alerts={commandAlerts} /> : null}

      <section id="district-overview">
        <HierarchyFilters
          districts={stateEducationData.districts.map((item) => ({ id: item.id, name: item.name }))}
          blocks={district.blocks.map((item) => ({ id: item.id, name: item.name }))}
          schools={block.schools.map((item) => ({ id: item.id, name: item.geoIdentity.schoolName }))}
          selectedDistrict={selectedDistrict}
          selectedBlock={selectedBlock}
          selectedSchool={selectedSchool}
          onDistrictChange={setSelectedDistrict}
          onBlockChange={setSelectedBlock}
          onSchoolChange={setSelectedSchool}
          summary={
            role === "ADMIN"
              ? districtSummary
              : role === "DISTRICT_OFFICER"
                ? districtSummary
                : role === "BLOCK_OFFICER" || role === "VIEWER"
                  ? blockSummary
                  : schoolSummary
          }
        />

        {role === "DISTRICT_OFFICER" ? <DistrictInsightsPanel district={district} /> : null}
        {role === "BLOCK_OFFICER" ? (
          <BlockOperationsPanel districtName={district.name} block={block} />
        ) : null}
        {role === "VIEWER" ? (
          <ViewerInsightsPanel
            schools={block.schools}
            title="Viewer Analytics Snapshot"
            subtitle="Read-only visibility for block-level monitoring and observation"
            readOnly
            modeLabel="Viewer"
          />
        ) : null}
        {role === "HEAD_MASTER_TEACHER" ? (
          <ViewerInsightsPanel
            schools={[school]}
            title="School Performance Snapshot"
            subtitle="School-level operational visibility for day-to-day monitoring"
            readOnly={false}
            modeLabel="School Admin"
          />
        ) : null}
      </section>

      <section id="school-intelligence">
        <GeoIdentityPanel school={school} />
        <InfrastructurePanel school={school} readOnly={isReadOnly} />
      </section>

      <section id="device-analytics">
        <DeviceAnalyticsPanel school={school} />
      </section>

      <section id="app-usage">
        <AppUsagePanel school={school} />
      </section>

      <section id="communication-hub">
        <CommunicationHubPanel school={school} readOnly={isReadOnly} />
      </section>

      <section id="user-activity">
        <UserActivityPanel school={school} />
      </section>

      <section id="command-center">
        <div id="alerts">
          <CommandCenterPanel schools={scopedSchools} alerts={scopedAlerts} />
        </div>
      </section>
    </div>
  );
};
