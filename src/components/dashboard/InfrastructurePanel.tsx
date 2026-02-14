import { useMemo, useState } from "react";
import { Card } from "../common/Card";
import { StatusPill } from "../common/StatusPill";
import type { School } from "../../types/domain";

interface InfrastructurePanelProps {
  school: School;
  readOnly?: boolean;
}

const boolToColor = (value: boolean): "GREEN" | "RED" => (value ? "GREEN" : "RED");
const boolToText = (value: boolean): string => (value ? "Available" : "Unavailable");
const electricityText = (value: boolean): string => (value ? "Yes" : "No");

const getDeviceInstallationStatus = (
  school: School
): { text: "Done" | "Pending" | "Not Done"; color: "GREEN" | "YELLOW" | "RED" } => {
  if (school.infrastructure.deviceInstalled) {
    return { text: "Done", color: "GREEN" };
  }

  const hasActiveDeviceTicket = school.infrastructure.tickets.some(
    (ticket) => ticket.category === "DEVICE" && ticket.status !== "RESOLVED"
  );

  if (hasActiveDeviceTicket) {
    return { text: "Pending", color: "YELLOW" };
  }

  return { text: "Not Done", color: "RED" };
};

const ticketColor = (status: "OPEN" | "IN_PROGRESS" | "RESOLVED"): "RED" | "YELLOW" | "GREEN" => {
  if (status === "OPEN") {
    return "RED";
  }
  if (status === "IN_PROGRESS") {
    return "YELLOW";
  }
  return "GREEN";
};

type DeviceCategory = "Hardware" | "Surveillance" | "Network" | "Power" | "Audio";
type DeviceAvailability = "ONLINE" | "OFFLINE";
type TicketStatus = School["infrastructure"]["tickets"][number]["status"];

interface DeviceRowTemplate {
  id: string;
  category: DeviceCategory;
  defaultStatus: DeviceAvailability;
}

interface DeviceRow {
  id: string;
  category: DeviceCategory;
  status: DeviceAvailability;
}

const deviceTemplates: DeviceRowTemplate[] = [
  { id: "IFP65D-01", category: "Hardware", defaultStatus: "ONLINE" },
  { id: "IFP65D-02", category: "Hardware", defaultStatus: "ONLINE" },
  { id: "AIO-EDU-11", category: "Hardware", defaultStatus: "OFFLINE" },
  { id: "NVR-CAM-04", category: "Surveillance", defaultStatus: "ONLINE" },
  { id: "ROUTER-AX5", category: "Network", defaultStatus: "ONLINE" },
  { id: "SWITCH-24P", category: "Network", defaultStatus: "OFFLINE" },
  { id: "UPS-3KVA-2", category: "Power", defaultStatus: "ONLINE" },
  { id: "CAM-CL10", category: "Surveillance", defaultStatus: "ONLINE" },
  { id: "MIC-ROOM1", category: "Audio", defaultStatus: "OFFLINE" }
];

const statusColorByDevice: Record<DeviceAvailability, "GREEN" | "RED"> = {
  ONLINE: "GREEN",
  OFFLINE: "RED"
};

const computeDeviceList = (school: School): DeviceRow[] => {
  const seed = school.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return deviceTemplates.map((template, index) => {
    let status: DeviceAvailability = template.defaultStatus;

    if (!school.infrastructure.internetConnectivity && template.category === "Network") {
      status = "OFFLINE";
    }

    if (!school.infrastructure.electricityAvailability && template.category === "Power") {
      status = "OFFLINE";
    }

    if (!school.infrastructure.deviceInstalled && template.category === "Hardware" && index % 2 === 0) {
      status = "OFFLINE";
    }

    if (template.category === "Surveillance" && (seed + index) % 6 === 0) {
      status = status === "ONLINE" ? "OFFLINE" : "ONLINE";
    }

    return {
      id: template.id,
      category: template.category,
      status
    };
  });
};

export const InfrastructurePanel = ({ school, readOnly = false }: InfrastructurePanelProps) => {
  const infra = school.infrastructure;
  const deviceStatus = getDeviceInstallationStatus(school);
  const [ticketQuery, setTicketQuery] = useState("");
  const [ticketFilter, setTicketFilter] = useState<"ALL" | TicketStatus>("ALL");
  const [deviceQuery, setDeviceQuery] = useState("");
  const [deviceFilter, setDeviceFilter] = useState<"ALL" | DeviceAvailability>("ALL");

  const filteredTickets = useMemo(() => {
    const normalizedQuery = ticketQuery.trim().toLowerCase();
    return infra.tickets.filter((ticket) => {
      const statusMatch = ticketFilter === "ALL" ? true : ticket.status === ticketFilter;
      const queryMatch =
        !normalizedQuery ||
        ticket.id.toLowerCase().includes(normalizedQuery) ||
        ticket.category.toLowerCase().includes(normalizedQuery) ||
        ticket.status.toLowerCase().includes(normalizedQuery);
      return statusMatch && queryMatch;
    });
  }, [infra.tickets, ticketFilter, ticketQuery]);

  const devices = useMemo(
    () => computeDeviceList(school),
    [
      school.id,
      school.infrastructure.deviceInstalled,
      school.infrastructure.electricityAvailability,
      school.infrastructure.internetConnectivity
    ]
  );

  const filteredDevices = useMemo(() => {
    const normalizedQuery = deviceQuery.trim().toLowerCase();
    return devices.filter((device) => {
      const statusMatch = deviceFilter === "ALL" ? true : device.status === deviceFilter;
      const queryMatch =
        !normalizedQuery ||
        device.id.toLowerCase().includes(normalizedQuery) ||
        device.category.toLowerCase().includes(normalizedQuery);
      return statusMatch && queryMatch;
    });
  }, [deviceFilter, deviceQuery, devices]);

  return (
    <Card
      title="Infrastructure Monitoring & Reporting"
      subtitle="Classroom readiness, maintenance tickets and health score"
    >
      <div className="module-grid module-3 infrastructure-grid">
        <div className="status-list">
          <div>
            <span>Smart Classroom</span>
            <StatusPill
              text={boolToText(infra.smartClassroomInstalled)}
              color={boolToColor(infra.smartClassroomInstalled)}
            />
          </div>
          <div>
            <span>Device Installation</span>
            <StatusPill text={deviceStatus.text} color={deviceStatus.color} />
          </div>
          <div>
            <span>Internet Connectivity</span>
            <StatusPill
              text={boolToText(infra.internetConnectivity)}
              color={boolToColor(infra.internetConnectivity)}
            />
          </div>
          <div>
            <span>Electricity Availability</span>
            <StatusPill
              text={electricityText(infra.electricityAvailability)}
              color={boolToColor(infra.electricityAvailability)}
            />
          </div>
          <div>
            <span>Hardware Condition</span>
            <StatusPill
              text={infra.hardwareCondition}
              color={
                infra.hardwareCondition === "GOOD"
                  ? "GREEN"
                  : infra.hardwareCondition === "FAIR"
                    ? "YELLOW"
                    : "RED"
              }
            />
          </div>
          <div className="health-meter">
            <span>Infrastructure Health Score</span>
            <strong>{infra.healthScore}%</strong>
            <div className="meter">
              <div style={{ width: `${infra.healthScore}%` }} />
            </div>
          </div>
        </div>

        <div className="infra-top-actions">
          {readOnly ? (
            <span className="readonly-chip">Read-Only</span>
          ) : (
            <button type="button" className="ghost-btn ticket-report-btn">
              Report Issue
            </button>
          )}
        </div>

        <div className="ticket-board">
          <div className="ticket-list-head">
            <div>
              <h4>Maintenance Tickets</h4>
              <p className="device-list-subtitle">Live maintenance queue and resolution status</p>
            </div>
            <div className="ticket-head-actions">
              <span className="device-count-chip">{filteredTickets.length} tickets</span>
            </div>
          </div>

          <div className="ticket-list-controls">
            <input
              value={ticketQuery}
              onChange={(event) => setTicketQuery(event.target.value)}
              placeholder="Search ticket / ID"
              aria-label="Search tickets"
            />
            <select
              value={ticketFilter}
              onChange={(event) => setTicketFilter(event.target.value as "ALL" | TicketStatus)}
              aria-label="Filter ticket status"
            >
              <option value="ALL">All Status</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>

          <div className="ticket-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Category</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.length > 0 ? (
                  filteredTickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td>{ticket.id}</td>
                      <td>{ticket.category}</td>
                      <td>
                        <StatusPill
                          text={ticket.status}
                          color={ticketColor(ticket.status)}
                          className="status-pill-sm ticket-status-pill"
                        />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="ticket-empty-row">
                      No maintenance tickets found for current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="device-list-board">
          <div className="device-list-head">
            <div>
              <h4>List of Devices</h4>
              <p className="device-list-subtitle">Live device availability and operational status</p>
            </div>
            <span className="device-count-chip">{filteredDevices.length} devices</span>
          </div>

          <div className="device-list-controls">
            <input
              value={deviceQuery}
              onChange={(event) => setDeviceQuery(event.target.value)}
              placeholder="Search device / ID"
              aria-label="Search devices"
            />
            <select
              value={deviceFilter}
              onChange={(event) => setDeviceFilter(event.target.value as "ALL" | DeviceAvailability)}
              aria-label="Filter device status"
            >
              <option value="ALL">All Status</option>
              <option value="ONLINE">Online</option>
              <option value="OFFLINE">Offline</option>
            </select>
          </div>

          <div className="device-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Category</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredDevices.length > 0 ? (
                  filteredDevices.map((device) => (
                    <tr key={device.id}>
                      <td>
                        <span className="device-id-inline" title={device.id}>
                          <span
                            className={`device-live-dot ${
                              device.status === "ONLINE" ? "device-live-dot-online" : "device-live-dot-offline"
                            }`}
                            aria-hidden="true"
                          />
                          {device.id}
                        </span>
                      </td>
                      <td>{device.category}</td>
                      <td>
                        <StatusPill
                          text={device.status}
                          color={statusColorByDevice[device.status]}
                          className="status-pill-sm device-status-pill"
                        />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="device-empty-row">
                      No devices found for current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Card>
  );
};
