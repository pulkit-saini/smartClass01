import { useEffect, useMemo, useState } from "react";
import { Card } from "../common/Card";
import type { School } from "../../types/domain";
import type { TimeSeriesPoint } from "../../types/domain";
import { SimpleBarChart } from "../charts/SimpleBarChart";
import { SimpleLineChart } from "../charts/SimpleLineChart";
import { SimplePieChart } from "../charts/SimplePieChart";

interface AppUsagePanelProps {
  school: School;
}

type AppCategory = "Educational" | "Utility" | "Non-Educational";
type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

interface AppInsight {
  name: string;
  minutes: number;
  percent: number;
  category: AppCategory;
  risk: RiskLevel;
  sessionsPerDay: number;
  avgSessionMinutes: number;
  peakWindow: string;
  weeklyTrend: TimeSeriesPoint[];
  monthlyTrend: TimeSeriesPoint[];
  notes: string[];
}

const CATEGORY_RULES: Record<string, AppCategory> = {
  LMS: "Educational",
  DIKSHA: "Educational",
  YouTube: "Non-Educational",
  Chrome: "Utility",
  Others: "Utility"
};

const WEEK_DAY_FACTORS = [0.88, 0.95, 1, 1.12, 1.08, 0.92, 0.75];
const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_FACTORS = [0.88, 0.94, 1.02, 1.08];
const MONTH_SLOTS = ["Week 1", "Week 2", "Week 3", "Week 4"];

const getCategory = (appName: string): AppCategory => CATEGORY_RULES[appName] ?? "Utility";

const getRisk = (category: AppCategory, percent: number): RiskLevel => {
  if (category === "Non-Educational" && percent >= 20) {
    return "HIGH";
  }
  if (category === "Non-Educational" || percent >= 15) {
    return "MEDIUM";
  }
  return "LOW";
};

const buildNotes = (category: AppCategory, risk: RiskLevel, percent: number): string[] => {
  const notes = [`Share of daily app usage: ${percent.toFixed(1)}%.`];

  if (category === "Educational") {
    notes.push("Aligned with digital learning outcomes and curriculum objectives.");
  } else if (category === "Utility") {
    notes.push("Supportive operational usage for class delivery and content access.");
  } else {
    notes.push("Monitor usage pattern to keep classroom focus on academic content.");
  }

  if (risk === "HIGH") {
    notes.push("High-priority review recommended at district monitoring level.");
  } else if (risk === "MEDIUM") {
    notes.push("Periodic review suggested by block-level operator.");
  } else {
    notes.push("Usage profile is within acceptable monitoring threshold.");
  }

  return notes;
};

export const AppUsagePanel = ({ school }: AppUsagePanelProps) => {
  const app = school.appAnalytics;
  const [selectedAppName, setSelectedAppName] = useState<string>("");

  const insights = useMemo<AppInsight[]>(() => {
    const totalMinutes = Math.max(
      1,
      app.usageDistribution.reduce((sum, slice) => sum + slice.minutes, 0)
    );

    return app.usageDistribution.map((slice) => {
      const percent = (slice.minutes / totalMinutes) * 100;
      const category = getCategory(slice.name);
      const risk = getRisk(category, percent);
      const sessionsPerDay = Math.max(1, Math.round(slice.minutes / 22));
      const avgSessionMinutes = Math.max(5, Math.round(slice.minutes / sessionsPerDay));
      const weeklyTrend = WEEK_DAYS.map((day, index) => ({
        label: day,
        value: Math.max(1, Math.round((slice.minutes / 7) * WEEK_DAY_FACTORS[index]))
      }));
      const monthlyTrend = MONTH_SLOTS.map((slot, index) => ({
        label: slot,
        value: Math.max(1, Math.round((slice.minutes / 4) * MONTH_FACTORS[index]))
      }));

      return {
        name: slice.name,
        minutes: slice.minutes,
        percent,
        category,
        risk,
        sessionsPerDay,
        avgSessionMinutes,
        peakWindow: category === "Educational" ? "09:00 - 12:00" : "12:00 - 15:00",
        weeklyTrend,
        monthlyTrend,
        notes: buildNotes(category, risk, percent)
      };
    });
  }, [app.usageDistribution]);

  useEffect(() => {
    if (!insights.some((entry) => entry.name === selectedAppName)) {
      setSelectedAppName(insights[0]?.name ?? "");
    }
  }, [insights, selectedAppName]);

  const selectedInsight =
    insights.find((entry) => entry.name === selectedAppName) ?? insights[0];

  if (!selectedInsight) {
    return null;
  }

  return (
    <Card title="Application Usage Intelligence" subtitle="Educational engagement versus non-educational usage">
      <div className="module-grid module-3">
        <div>
          <h4>App Usage Distribution</h4>
          <SimplePieChart data={app.usageDistribution} />
        </div>
        <div>
          <h4>Usage Trend (Monthly Minutes)</h4>
          <SimpleLineChart data={app.trend} color="#2f6fed" />
        </div>
        <div className="usage-summary">
          <div className="kpi-grid">
            <div>
              <span>Educational Usage</span>
              <strong>{app.educationalPercent}%</strong>
            </div>
            <div>
              <span>Non-Educational Usage</span>
              <strong>{app.nonEducationalPercent}%</strong>
            </div>
            <div>
              <span>Total Screen Time</span>
              <strong>{app.totalScreenTimeHours}h</strong>
            </div>
          </div>
          <h4>Top Apps (Clickable)</h4>
          <div className="app-chip-grid">
            {insights.map((insight) => (
              <button
                key={insight.name}
                type="button"
                className={`app-chip-btn ${insight.name === selectedInsight.name ? "active" : ""}`}
                onClick={() => setSelectedAppName(insight.name)}
              >
                {insight.name} ({insight.percent.toFixed(1)}%)
              </button>
            ))}
          </div>
          {app.unusualAlerts.length > 0 ? (
            <>
              <h4>Unusual Usage Alerts</h4>
              <ul className="log-list">
                {app.unusualAlerts.map((alert) => (
                  <li key={alert}>{alert}</li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </div>

      <div className="app-explorer">
        <div className="app-explorer-header">
          <h4>App Deep Analytics</h4>
          <p className="section-hint">Click an app below to inspect complete usage intelligence.</p>
        </div>

        <div className="app-selector-grid">
          {insights.map((insight) => (
            <button
              key={insight.name}
              type="button"
              className={`app-selector-btn ${insight.name === selectedInsight.name ? "active" : ""}`}
              onClick={() => setSelectedAppName(insight.name)}
            >
              <span>{insight.name}</span>
              <strong>{insight.minutes} min</strong>
              <small>{insight.category}</small>
            </button>
          ))}
        </div>

        <div className="module-grid module-3">
          <div className="selected-app-panel">
            <h4>{selectedInsight.name} Overview</h4>
            <div className="kpi-grid">
              <div>
                <span>Usage Share</span>
                <strong>{selectedInsight.percent.toFixed(1)}%</strong>
              </div>
              <div>
                <span>Daily Sessions</span>
                <strong>{selectedInsight.sessionsPerDay}</strong>
              </div>
              <div>
                <span>Avg Session</span>
                <strong>{selectedInsight.avgSessionMinutes} min</strong>
              </div>
              <div>
                <span>Peak Window</span>
                <strong>{selectedInsight.peakWindow}</strong>
              </div>
            </div>
            <ul className="log-list">
              {selectedInsight.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4>{selectedInsight.name} Weekly Activity</h4>
            <SimpleBarChart data={selectedInsight.weeklyTrend} color="#1e8f4e" />
          </div>

          <div>
            <h4>{selectedInsight.name} Monthly Pattern</h4>
            <SimpleLineChart data={selectedInsight.monthlyTrend} color="#e85d04" />
          </div>
        </div>
      </div>
    </Card>
  );
};
