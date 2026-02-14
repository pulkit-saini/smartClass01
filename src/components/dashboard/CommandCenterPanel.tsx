import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Card } from "../common/Card";
import { StatusPill } from "../common/StatusPill";
import type { CommandAlert, School } from "../../types/domain";
import { formatDateTime } from "../../utils/analytics";

interface CommandCenterPanelProps {
  schools: School[];
  alerts: CommandAlert[];
}

const MAX_VISIBLE_SCHOOLS = 6;
const MAX_VISIBLE_ALERTS = 5;

const statusColor = (status: School["geoIdentity"]["internetStatus"]): "GREEN" | "YELLOW" | "RED" => {
  if (status === "ONLINE") {
    return "GREEN";
  }
  if (status === "OFFLINE") {
    return "YELLOW";
  }
  return "RED";
};

const shortenDistrict = (district: string): string => {
  if (district.length <= 11) {
    return district;
  }
  return `${district.slice(0, 11)}...`;
};

const normalizeAlertText = (text: string): string => text.replace(/\s+/g, " ").trim();

export const CommandCenterPanel = ({ schools, alerts }: CommandCenterPanelProps) => {
  const [query, setQuery] = useState("");
  const [showAllSchools, setShowAllSchools] = useState(false);
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  const schoolScrollRef = useRef<HTMLDivElement | null>(null);
  const alertScrollRef = useRef<HTMLDivElement | null>(null);
  const schoolScrollTopRef = useRef(0);
  const alertScrollTopRef = useRef(0);

  const filteredSchools = useMemo(() => {
    if (!query.trim()) {
      return schools;
    }

    const normalized = query.trim().toLowerCase();
    return schools.filter(
      (school) =>
        school.geoIdentity.schoolName.toLowerCase().includes(normalized) ||
        school.geoIdentity.udiseCode.toLowerCase().includes(normalized) ||
        school.geoIdentity.block.toLowerCase().includes(normalized)
    );
  }, [query, schools]);

  const orderedAlerts = useMemo(
    () =>
      alerts
        .filter((alert) => alert.severity === "RED")
        .slice()
        .sort(
          (first, second) =>
            new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
        ),
    [alerts]
  );

  const visibleSchools = useMemo(
    () => (showAllSchools ? filteredSchools : filteredSchools.slice(0, MAX_VISIBLE_SCHOOLS)),
    [filteredSchools, showAllSchools]
  );

  const visibleAlerts = useMemo(
    () => (showAllAlerts ? orderedAlerts : orderedAlerts.slice(0, MAX_VISIBLE_ALERTS)),
    [orderedAlerts, showAllAlerts]
  );

  useLayoutEffect(() => {
    if (schoolScrollRef.current) {
      schoolScrollRef.current.scrollTop = schoolScrollTopRef.current;
    }
  }, [visibleSchools.length, showAllSchools, query]);

  useLayoutEffect(() => {
    if (alertScrollRef.current) {
      alertScrollRef.current.scrollTop = alertScrollTopRef.current;
    }
  }, [visibleAlerts.length, showAllAlerts]);

  const summary = useMemo(() => {
    const online = schools.filter((school) => school.geoIdentity.internetStatus === "ONLINE").length;
    const offline = schools.filter((school) => school.geoIdentity.internetStatus === "OFFLINE").length;
    const inactive = schools.filter((school) => school.geoIdentity.internetStatus === "INACTIVE").length;

    return {
      online,
      offline,
      inactive,
      activeDevices: schools.filter((school) => school.deviceAnalytics.deviceHealth !== "CRITICAL").length
    };
  }, [schools]);

  const schoolToggleVisible = filteredSchools.length > MAX_VISIBLE_SCHOOLS;
  const alertToggleVisible = orderedAlerts.length > MAX_VISIBLE_ALERTS;

  return (
    <Card title="Live Command Center" subtitle="Real-time statewide operations and emergency communication">
      <div className="command-kpi-row">
        <div className="command-kpi-card">
          <span>Online Schools</span>
          <strong>{summary.online}</strong>
        </div>
        <div className="command-kpi-card">
          <span>Offline Schools</span>
          <strong>{summary.offline}</strong>
        </div>
        <div className="command-kpi-card">
          <span>Inactive Schools</span>
          <strong>{summary.inactive}</strong>
        </div>
        <div className="command-kpi-card">
          <span>Active Devices</span>
          <strong>{summary.activeDevices}</strong>
        </div>
      </div>

      <div className="command-center-grid">
        <section className="command-card-shell">
          <div className="command-card-head">
            <h4>Live School Status</h4>
            <div className="command-head-actions">
              <input
                className="command-search-input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Quick search school / UDISE / block"
              />
              {schoolToggleVisible ? (
                <button
                  type="button"
                  className="ghost-btn command-mini-btn"
                  onClick={() => setShowAllSchools((previous) => !previous)}
                >
                  {showAllSchools ? "Collapse" : "View All"}
                </button>
              ) : null}
            </div>
          </div>

          <div
            className="command-scroll-area"
            ref={schoolScrollRef}
            onScroll={(event) => {
              schoolScrollTopRef.current = event.currentTarget.scrollTop;
            }}
          >
            {visibleSchools.length ? (
              <table className="command-table" aria-label="Live school status table">
                <colgroup>
                  <col style={{ width: "51%" }} />
                  <col style={{ width: "21%" }} />
                  <col style={{ width: "28%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>School</th>
                    <th>District</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleSchools.map((school) => (
                    <tr key={school.id}>
                      <td className="command-school-name" title={school.geoIdentity.schoolName}>
                        <span>{school.geoIdentity.schoolName}</span>
                      </td>
                      <td className="command-school-district" title={school.geoIdentity.district}>
                        <span>{shortenDistrict(school.geoIdentity.district)}</span>
                      </td>
                      <td className="command-school-status">
                        <StatusPill
                          text={school.geoIdentity.internetStatus}
                          color={statusColor(school.geoIdentity.internetStatus)}
                          className="status-pill-sm"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="command-empty">No school found for current search.</p>
            )}
          </div>

          <p className="command-footnote">
            Showing {visibleSchools.length} of {filteredSchools.length} schools
          </p>
        </section>

        <section className="command-card-shell">
          <div className="command-card-head">
            <h4>Critical Alerts</h4>
            {alertToggleVisible ? (
              <button
                type="button"
                className="ghost-btn command-mini-btn"
                onClick={() => setShowAllAlerts((previous) => !previous)}
              >
                {showAllAlerts ? "Collapse" : "View All"}
              </button>
            ) : null}
          </div>

          <div
            className="command-scroll-area"
            ref={alertScrollRef}
            onScroll={(event) => {
              alertScrollTopRef.current = event.currentTarget.scrollTop;
            }}
          >
            {visibleAlerts.length ? (
              <ul className="command-alert-list">
                {visibleAlerts.map((alert) => {
                  const alertText = normalizeAlertText(alert.text);

                  return (
                    <li key={alert.id} className="command-alert-item">
                      <div className="command-alert-line">
                        <StatusPill text={alert.severity} color={alert.severity} className="status-pill-sm" />
                        <span className="command-alert-school" title={alert.schoolName}>
                          {alert.schoolName}
                        </span>
                        <span className="command-alert-message" title={alertText}>
                          {alertText}
                        </span>
                      </div>
                      <div className="command-alert-time">{formatDateTime(alert.createdAt)}</div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="command-empty">No critical alerts available in current scope.</p>
            )}
          </div>

          <p className="command-footnote">
            Showing {visibleAlerts.length} of {orderedAlerts.length} alerts
          </p>
        </section>
      </div>
    </Card>
  );
};
