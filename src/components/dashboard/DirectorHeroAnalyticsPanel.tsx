import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { CommandAlert, School } from "../../types/domain";
import { computeStateSummary } from "../../utils/analytics";

interface DirectorHeroAnalyticsPanelProps {
  schools: School[];
  alerts: CommandAlert[];
}

type StatusSlice = {
  name: "Online" | "Offline" | "Inactive";
  value: number;
};

type DistrictBarRow = {
  label: string;
  fullLabel: string;
  online: number;
  offlineTotal: number;
};

type KpiCardTone = "blue" | "green" | "red" | "violet";
type KpiIconType = "schools" | "online" | "alerts" | "devices";

const statusColor: Record<StatusSlice["name"], string> = {
  Online: "#1fb667",
  Offline: "#f59e0b",
  Inactive: "#ef4444"
};

const TooltipStyle = {
  background: "var(--surface)",
  border: "1px solid var(--stroke)",
  borderRadius: 12
};

const KpiIcon = ({ type }: { type: KpiIconType }) => {
  if (type === "schools") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 10 12 4l9 6" stroke="currentColor" strokeWidth="1.9" />
        <path d="M5 10v10h14V10" stroke="currentColor" strokeWidth="1.9" />
        <path d="M9 20v-5h6v5" stroke="currentColor" strokeWidth="1.9" />
        <circle cx="12" cy="8.4" r="1.1" fill="currentColor" />
      </svg>
    );
  }

  if (type === "online") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 14h4l2-5 3 9 2-6h7" stroke="currentColor" strokeWidth="1.9" />
      </svg>
    );
  }

  if (type === "alerts") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3 2.8 20h18.4L12 3Z" stroke="currentColor" strokeWidth="1.9" />
        <path d="M12 9.3v4.6M12 17.2h.01" stroke="currentColor" strokeWidth="1.9" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="12" rx="2.2" stroke="currentColor" strokeWidth="1.9" />
      <path d="M9 20h6" stroke="currentColor" strokeWidth="1.9" />
    </svg>
  );
};

const abbreviateLabel = (value: string): string => {
  if (value.length <= 12) {
    return value;
  }
  return `${value.slice(0, 11)}…`;
};

export const DirectorHeroAnalyticsPanel = ({ schools, alerts }: DirectorHeroAnalyticsPanelProps) => {
  const summary = useMemo(() => computeStateSummary(schools), [schools]);

  const statusSlices = useMemo<StatusSlice[]>(
    () => [
      { name: "Online", value: summary.online },
      { name: "Offline", value: summary.offline },
      { name: "Inactive", value: summary.inactive }
    ],
    [summary]
  );

  const onlinePercent = Math.round((summary.online / Math.max(summary.totalSchools, 1)) * 100);
  const districtCount = new Set(schools.map((school) => school.geoIdentity.district)).size;
  const criticalAlerts = alerts.filter((alert) => alert.severity === "RED").length;

  const deviceStats = useMemo(() => {
    const result = schools.reduce(
      (accumulator, school) => {
        const estimatedTotal = school.infrastructure.deviceInstalled ? 4 : 2;
        const multiplier =
          school.geoIdentity.internetStatus === "ONLINE"
            ? 0.88
            : school.geoIdentity.internetStatus === "OFFLINE"
              ? 0.52
              : 0.2;

        const estimatedActive = Math.max(0, Math.round(estimatedTotal * multiplier));

        return {
          totalDevices: accumulator.totalDevices + estimatedTotal,
          activeDevices: accumulator.activeDevices + estimatedActive
        };
      },
      { totalDevices: 0, activeDevices: 0 }
    );

    return {
      totalDevices: Math.max(result.totalDevices, 1),
      activeDevices: Math.min(result.activeDevices, Math.max(result.totalDevices, 1))
    };
  }, [schools]);

  const districtBars = useMemo<DistrictBarRow[]>(() => {
    const grouped = new Map<string, { online: number; offlineTotal: number }>();

    schools.forEach((school) => {
      const district = school.geoIdentity.district;
      const current = grouped.get(district) ?? { online: 0, offlineTotal: 0 };

      if (school.geoIdentity.internetStatus === "ONLINE") {
        current.online += 1;
      } else {
        current.offlineTotal += 1;
      }

      grouped.set(district, current);
    });

    return Array.from(grouped.entries())
      .map(([district, values]) => ({
        label: abbreviateLabel(district),
        fullLabel: district,
        online: values.online,
        offlineTotal: values.offlineTotal
      }))
      .sort((first, second) => second.online + second.offlineTotal - (first.online + first.offlineTotal))
      .slice(0, 8);
  }, [schools]);

  const kpiCards: { label: string; value: string; meta: string; tone: KpiCardTone; icon: KpiIconType }[] = [
    {
      label: "Total Schools",
      value: summary.totalSchools.toLocaleString("en-IN"),
      meta: `${districtCount} districts covered`,
      tone: "blue",
      icon: "schools"
    },
    {
      label: "Online Schools",
      value: summary.online.toLocaleString("en-IN"),
      meta: `${onlinePercent}% active`,
      tone: "green",
      icon: "online"
    },
    {
      label: "Critical Alerts",
      value: criticalAlerts.toLocaleString("en-IN"),
      meta: criticalAlerts > 0 ? "Requires attention" : "No critical issue",
      tone: "red",
      icon: "alerts"
    },
    {
      label: "Active Devices",
      value: deviceStats.activeDevices.toLocaleString("en-IN"),
      meta: `of ${deviceStats.totalDevices.toLocaleString("en-IN")} devices`,
      tone: "violet",
      icon: "devices"
    }
  ];

  return (
    <section className="director-hero-stack">
      <div className="director-kpi-grid">
        {kpiCards.map((card) => (
          <article key={card.label} className={`director-kpi-card director-kpi-${card.tone}`}>
            <div className="director-kpi-text">
              <p>{card.label}</p>
              <strong>{card.value}</strong>
              <span>{card.meta}</span>
            </div>
            <div className="director-kpi-icon">
              <KpiIcon type={card.icon} />
            </div>
          </article>
        ))}
      </div>

      <div className="director-analytics-grid">
        <section className="director-analytics-card">
          <header className="director-analytics-header">
            <h3>School Status Distribution</h3>
            <p>Live connectivity status across the state</p>
          </header>
          <div className="director-pie-wrap">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusSlices}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={82}
                  innerRadius={50}
                  paddingAngle={2}
                >
                  {statusSlices.map((slice) => (
                    <Cell key={slice.name} fill={statusColor[slice.name]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="director-status-list">
            {statusSlices.map((slice) => (
              <li key={slice.name}>
                <span className="director-dot" style={{ background: statusColor[slice.name] }} />
                <span>{slice.name}</span>
                <strong>{slice.value}</strong>
              </li>
            ))}
          </ul>
        </section>

        <section className="director-analytics-card">
          <header className="director-analytics-header">
            <h3>District-Wise School Status</h3>
            <p>Top districts by reporting volume</p>
          </header>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={districtBars} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="label" stroke="var(--text-muted)" />
                <YAxis stroke="var(--text-muted)" />
                <Tooltip
                  contentStyle={TooltipStyle}
                  labelFormatter={(_value, payload) =>
                    payload && payload[0] ? payload[0].payload.fullLabel : String(_value)
                  }
                />
                <Legend />
                <Bar dataKey="online" name="Online" fill="#1fb667" radius={[7, 7, 0, 0]} />
                <Bar
                  dataKey="offlineTotal"
                  name="Offline + Inactive"
                  fill="#ef4444"
                  radius={[7, 7, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </section>
  );
};
