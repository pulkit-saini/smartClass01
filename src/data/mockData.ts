import type {
  Block,
  CommandAlert,
  District,
  MaintenanceTicket,
  School,
  SchoolConnectionStatus,
  StateEducationData,
  TimeSeriesPoint,
  TimelinePoint
} from "../types/domain";
import { schoolDirectory } from "./schoolDirectory";
import { schoolHoursIsoFromHoursAgo } from "../utils/analytics";

type SchoolProfile = "HILL_REMOTE" | "SEMI_URBAN" | "URBAN_FRINGE" | "RIVER_BELT";

const districtCenters: Record<string, { lat: number; lng: number }> = {
  ALMORA: { lat: 29.597, lng: 79.659 },
  BAGESHWAR: { lat: 29.838, lng: 79.773 },
  CHAMOLI: { lat: 30.431, lng: 79.327 },
  CHAMPAWAT: { lat: 29.336, lng: 80.091 },
  DEHRADUN: { lat: 30.316, lng: 78.032 },
  HARIDWAR: { lat: 29.945, lng: 78.164 },
  NAINITAL: { lat: 29.391, lng: 79.454 },
  "PAURI GARHWAL": { lat: 30.149, lng: 78.778 },
  PITHORAGARH: { lat: 29.585, lng: 80.209 },
  RUDRAPRYAG: { lat: 30.284, lng: 78.98 },
  "TEHRI GARHWAL": { lat: 30.391, lng: 78.48 },
  "U.S.NAGAR": { lat: 28.975, lng: 79.401 },
  UTTARKASHI: { lat: 30.729, lng: 78.444 }
};

const districtConnectivityBias: Record<string, number> = {
  ALMORA: -5,
  BAGESHWAR: -7,
  CHAMOLI: -8,
  CHAMPAWAT: -6,
  DEHRADUN: 10,
  HARIDWAR: 8,
  NAINITAL: 3,
  "PAURI GARHWAL": -4,
  PITHORAGARH: -9,
  RUDRAPRYAG: -8,
  "TEHRI GARHWAL": -6,
  "U.S.NAGAR": 6,
  UTTARKASHI: -9
};

const districtPowerBias: Record<string, number> = {
  ALMORA: -2,
  BAGESHWAR: -4,
  CHAMOLI: -5,
  CHAMPAWAT: -3,
  DEHRADUN: 8,
  HARIDWAR: 6,
  NAINITAL: 2,
  "PAURI GARHWAL": -1,
  PITHORAGARH: -4,
  RUDRAPRYAG: -5,
  "TEHRI GARHWAL": -3,
  "U.S.NAGAR": 5,
  UTTARKASHI: -6
};

const profileConfig: Record<
  SchoolProfile,
  {
    connectivityBase: number;
    powerBase: number;
    usageBase: number;
    operatorBase: number;
    riskSensitivity: number;
  }
> = {
  HILL_REMOTE: {
    connectivityBase: 52,
    powerBase: 58,
    usageBase: 4.2,
    operatorBase: 1,
    riskSensitivity: 1.18
  },
  SEMI_URBAN: {
    connectivityBase: 68,
    powerBase: 70,
    usageBase: 5.6,
    operatorBase: 2,
    riskSensitivity: 1
  },
  URBAN_FRINGE: {
    connectivityBase: 78,
    powerBase: 80,
    usageBase: 6.4,
    operatorBase: 3,
    riskSensitivity: 0.82
  },
  RIVER_BELT: {
    connectivityBase: 62,
    powerBase: 66,
    usageBase: 5.1,
    operatorBase: 2,
    riskSensitivity: 1.06
  }
};

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthWeeks = ["W1", "W2", "W3", "W4"];
const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const timelineSlots = ["06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00"];

const hashString = (input: string): number => {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) % 2147483647;
  }
  return hash;
};

const seeded = (seed: number, salt: number): number => {
  const raw = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return raw - Math.floor(raw);
};

const seededRange = (seed: number, salt: number, min: number, max: number): number =>
  min + (max - min) * seeded(seed, salt);

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const toIsoHoursAgo = (hoursAgo: number): string => schoolHoursIsoFromHoursAgo(hoursAgo);

const deriveProfile = (seed: number): SchoolProfile => {
  const marker = seeded(seed, 1);
  if (marker < 0.23) {
    return "HILL_REMOTE";
  }
  if (marker < 0.54) {
    return "SEMI_URBAN";
  }
  if (marker < 0.82) {
    return "URBAN_FRINGE";
  }
  return "RIVER_BELT";
};

const deriveInternetStatus = (connectivityScore: number): SchoolConnectionStatus => {
  if (connectivityScore >= 70) {
    return "ONLINE";
  }
  if (connectivityScore >= 45) {
    return "OFFLINE";
  }
  return "INACTIVE";
};

const deriveHardwareCondition = (
  healthScore: number
): "GOOD" | "FAIR" | "CRITICAL" => {
  if (healthScore >= 74) {
    return "GOOD";
  }
  if (healthScore >= 53) {
    return "FAIR";
  }
  return "CRITICAL";
};

const buildTimeline = (seed: number, status: SchoolConnectionStatus): TimelinePoint[] => {
  return timelineSlots.map((slot, index) => {
    const teachingWindow = index >= 1 && index <= 5;
    let active = teachingWindow ? 1 : 0;

    if (status === "OFFLINE" && teachingWindow && seeded(seed, 140 + index) > 0.63) {
      active = 0;
    }
    if (status === "INACTIVE" && teachingWindow && seeded(seed, 155 + index) > 0.22) {
      active = 0;
    }

    return { slot, active };
  });
};

const buildWeeklyUsage = (seed: number, dailyUsageHours: number): TimeSeriesPoint[] => {
  const multipliers = [0.9, 0.96, 1.03, 1.08, 1.02, 0.84];
  return weekDays.map((label, index) => ({
    label,
    value: Math.max(
      1,
      Math.round(dailyUsageHours * multipliers[index] + seededRange(seed, 200 + index, -0.6, 0.8))
    )
  }));
};

const buildMonthlyUsage = (seed: number, dailyUsageHours: number): TimeSeriesPoint[] =>
  monthWeeks.map((label, index) => ({
    label,
    value: Math.max(
      8,
      Math.round(dailyUsageHours * (4.2 + index * 0.22) + seededRange(seed, 240 + index, -1.5, 2.8))
    )
  }));

const buildAppTrend = (seed: number, monthlyMinutes: number): TimeSeriesPoint[] =>
  monthLabels.map((label, index) => ({
    label,
    value: Math.max(
      60,
      Math.round(monthlyMinutes * (0.82 + index * 0.06) + seededRange(seed, 270 + index, -30, 35))
    )
  }));

const createTickets = (
  seed: number,
  udiseCode: string,
  status: SchoolConnectionStatus,
  healthScore: number
): MaintenanceTicket[] => {
  const tickets: MaintenanceTicket[] = [];

  if (status !== "ONLINE") {
    tickets.push({
      id: `TK-${udiseCode}-1`,
      category: "INTERNET",
      description: "Network instability impacting content sync and live class streaming.",
      status: status === "INACTIVE" ? "OPEN" : "IN_PROGRESS",
      raisedAt: toIsoHoursAgo(6 + Math.round(seededRange(seed, 300, 4, 22)))
    });
  }

  if (healthScore < 60 || seeded(seed, 301) > 0.7) {
    tickets.push({
      id: `TK-${udiseCode}-2`,
      category: seeded(seed, 302) > 0.5 ? "DEVICE" : "HARDWARE",
      description: "Panel response lag observed during lesson sessions.",
      status: healthScore < 52 ? "OPEN" : "IN_PROGRESS",
      raisedAt: toIsoHoursAgo(12 + Math.round(seededRange(seed, 303, 8, 38)))
    });
  }

  tickets.push({
    id: `TK-${udiseCode}-3`,
    category: "POWER",
    description: "Preventive electrical check completed for classroom panel circuit.",
    status: "RESOLVED",
    raisedAt: toIsoHoursAgo(60 + Math.round(seededRange(seed, 304, 10, 70)))
  });

  return tickets;
};

const createSchoolFromDirectory = (
  districtName: string,
  blockName: string,
  udiseCode: string,
  schoolName: string
): School => {
  const seed = hashString(`${districtName}-${udiseCode}-${schoolName}`);
  const center = districtCenters[districtName] ?? { lat: 30.0668, lng: 79.0193 };
  const profile = deriveProfile(seed);
  const profileValues = profileConfig[profile];

  const latitude = center.lat + seededRange(seed, 20, -0.11, 0.11);
  const longitude = center.lng + seededRange(seed, 21, -0.11, 0.11);

  const connectivityScore = clamp(
    profileValues.connectivityBase + (districtConnectivityBias[districtName] ?? 0) + seededRange(seed, 31, -15, 14),
    18,
    97
  );
  const powerScore = clamp(
    profileValues.powerBase + (districtPowerBias[districtName] ?? 0) + seededRange(seed, 32, -13, 13),
    24,
    98
  );

  const internetStatus = deriveInternetStatus(connectivityScore);
  const powerStatus: "ON" | "OFF" = powerScore >= 46 && internetStatus !== "INACTIVE" ? "ON" : "OFF";

  const baseUsage = profileValues.usageBase + seededRange(seed, 40, -1.1, 1.2);
  const dailyUsageHours = clamp(
    internetStatus === "ONLINE"
      ? baseUsage
      : internetStatus === "OFFLINE"
        ? baseUsage - seededRange(seed, 41, 1.2, 2.2)
        : baseUsage - seededRange(seed, 42, 2.4, 3.4),
    0.8,
    8.2
  );

  const activeRatio = clamp(
    0.66 + seededRange(seed, 43, -0.09, 0.17) - (internetStatus === "ONLINE" ? 0 : 0.06),
    0.52,
    0.9
  );
  const activeHours = Math.round(dailyUsageHours * activeRatio * 10) / 10;
  const idleHours = Math.round(Math.max(0.4, dailyUsageHours - activeHours) * 10) / 10;

  const uptimeScore = clamp(
    100 - (internetStatus === "INACTIVE" ? 45 : internetStatus === "OFFLINE" ? 22 : 8) -
      seededRange(seed, 44, 0, 14),
    18,
    97
  );

  const healthScore = Math.round(
    clamp(
      connectivityScore * 0.42 + powerScore * 0.28 + uptimeScore * 0.3 - seededRange(seed, 45, 0, 10) * profileValues.riskSensitivity,
      22,
      97
    )
  );

  const deviceHealth: "HEALTHY" | "WARNING" | "CRITICAL" =
    healthScore < 45 || internetStatus === "INACTIVE"
      ? "CRITICAL"
      : healthScore < 65 || internetStatus === "OFFLINE"
        ? "WARNING"
        : "HEALTHY";

  const offlineDurationHours =
    internetStatus === "ONLINE"
      ? Math.round(seededRange(seed, 46, 0.6, 2.6) * 10) / 10
      : internetStatus === "OFFLINE"
        ? Math.round(seededRange(seed, 47, 3.4, 8.4) * 10) / 10
        : Math.round(seededRange(seed, 48, 9.5, 22.0) * 10) / 10;

  const totalMinutes = Math.round(dailyUsageHours * 60 * seededRange(seed, 49, 0.86, 1.16));
  const educationalShare = clamp(
    seededRange(seed, 50, 0.58, 0.86) + (internetStatus === "ONLINE" ? 0.04 : -0.06),
    0.48,
    0.9
  );

  const educationalMinutes = Math.round(totalMinutes * educationalShare);
  const nonEducationalMinutes = Math.max(0, totalMinutes - educationalMinutes);

  const lmsMinutes = Math.round(educationalMinutes * seededRange(seed, 51, 0.42, 0.58));
  const dikshaMinutes = Math.max(15, educationalMinutes - lmsMinutes);
  const youtubeMinutes = Math.round(nonEducationalMinutes * seededRange(seed, 52, 0.38, 0.62));
  const chromeMinutes = Math.round(nonEducationalMinutes * seededRange(seed, 53, 0.22, 0.42));
  const othersMinutes = Math.max(8, totalMinutes - (lmsMinutes + dikshaMinutes + youtubeMinutes + chromeMinutes));

  const usageDistribution = [
    { name: "LMS", minutes: lmsMinutes },
    { name: "DIKSHA", minutes: dikshaMinutes },
    { name: "YouTube", minutes: youtubeMinutes },
    { name: "Chrome", minutes: chromeMinutes },
    { name: "Others", minutes: othersMinutes }
  ];

  const sortedApps = usageDistribution
    .slice()
    .sort((a, b) => b.minutes - a.minutes)
    .map((item) => item.name)
    .slice(0, 4);

  const unusualAlerts: string[] = [];
  const nonEducationalPercent = Math.round((100 * (youtubeMinutes + chromeMinutes + othersMinutes)) / Math.max(1, totalMinutes));

  if (nonEducationalPercent > 38) {
    unusualAlerts.push("Non-educational usage is above configured monitoring threshold.");
  }
  if (internetStatus !== "ONLINE") {
    unusualAlerts.push("Connectivity interruptions are impacting app session continuity.");
  }

  const activeOperators = clamp(
    Math.round(profileValues.operatorBase + seededRange(seed, 60, -1, 2)),
    1,
    4
  );

  return {
    id: `UK-${udiseCode}`,
    geoIdentity: {
      schoolName,
      udiseCode,
      address: `${blockName}, ${districtName}`,
      district: districtName,
      block: blockName,
      latitude,
      longitude,
      internetStatus,
      powerStatus,
      lastDeviceSync: toIsoHoursAgo(Math.round(seededRange(seed, 61, 1, 11))),
      lastActivity: toIsoHoursAgo(Math.round(seededRange(seed, 62, 0, 6)))
    },
    infrastructure: {
      smartClassroomInstalled: seeded(seed, 70) > 0.06,
      deviceInstalled: seeded(seed, 71) > 0.09,
      internetConnectivity: internetStatus !== "INACTIVE",
      electricityAvailability: powerStatus === "ON",
      hardwareCondition: deriveHardwareCondition(healthScore),
      healthScore,
      tickets: createTickets(seed, udiseCode, internetStatus, healthScore)
    },
    deviceAnalytics: {
      dailyUsageHours: Math.round(dailyUsageHours * 10) / 10,
      activeHours,
      idleHours,
      offlineDurationHours,
      deviceHealth,
      lastRestart: toIsoHoursAgo(Math.round(seededRange(seed, 72, 5, 52))),
      errorLogs:
        deviceHealth === "CRITICAL"
          ? ["Repeated panel restart loop detected", "Network handshake failures over threshold"]
          : deviceHealth === "WARNING"
            ? ["High memory usage spikes during peak hours"]
            : ["No major device fault in current monitoring cycle"],
      onOffTimeline: buildTimeline(seed, internetStatus),
      weeklyUsage: buildWeeklyUsage(seed, dailyUsageHours),
      monthlyUsage: buildMonthlyUsage(seed, dailyUsageHours)
    },
    appAnalytics: {
      usageDistribution,
      educationalPercent: 100 - nonEducationalPercent,
      nonEducationalPercent,
      totalScreenTimeHours: Math.round((totalMinutes / 60) * 10) / 10,
      trend: buildAppTrend(seed, totalMinutes),
      topUsedApps: sortedApps,
      unusualAlerts
    },
    communication: {
      liveAccessEnabled: seeded(seed, 80) > 0.04,
      cameraAccessEnabled: seeded(seed, 81) > 0.12,
      broadcastHistory: [
        {
          id: `BC-${udiseCode}-1`,
          type: "TEXT",
          title: "District assessment schedule broadcast",
          sentAt: toIsoHoursAgo(Math.round(seededRange(seed, 82, 2, 14)))
        },
        {
          id: `BC-${udiseCode}-2`,
          type: seeded(seed, 83) > 0.6 ? "PDF" : "AUDIO",
          title: "Teacher training and lesson-planning module",
          sentAt: toIsoHoursAgo(Math.round(seededRange(seed, 84, 16, 40)))
        }
      ]
    },
    userActivity: {
      loginFrequencyWeekly: [
        { label: "Mon", value: Math.round(clamp(activeOperators + seededRange(seed, 90, 0, 2), 1, 7)) },
        { label: "Tue", value: Math.round(clamp(activeOperators + seededRange(seed, 91, 0, 2), 1, 7)) },
        { label: "Wed", value: Math.round(clamp(activeOperators + seededRange(seed, 92, 0, 2), 1, 7)) },
        { label: "Thu", value: Math.round(clamp(activeOperators + seededRange(seed, 93, 0, 2), 1, 7)) },
        { label: "Fri", value: Math.round(clamp(activeOperators + seededRange(seed, 94, 0, 2), 1, 7)) }
      ],
      sessionDurationMinutes: [
        { label: "Week 1", value: Math.round(seededRange(seed, 95, 28, 56)) },
        { label: "Week 2", value: Math.round(seededRange(seed, 96, 30, 58)) },
        { label: "Week 3", value: Math.round(seededRange(seed, 97, 32, 62)) },
        { label: "Week 4", value: Math.round(seededRange(seed, 98, 34, 64)) }
      ],
      activeOperators,
      inactiveSchoolsDetected: internetStatus === "INACTIVE" ? 1 : 0,
      behaviorSummary:
        profile === "HILL_REMOTE"
          ? "Session spikes occur around morning classes; afternoon activity drops with connectivity fluctuations."
          : "Teacher and operator sessions are stable across weekdays, with strongest engagement between 09:00 and 14:00."
    }
  };
};

const groupByDistrict = () => {
  const grouped: Record<string, typeof schoolDirectory> = {};
  schoolDirectory.forEach((entry) => {
    if (!grouped[entry.district]) {
      grouped[entry.district] = [];
    }
    grouped[entry.district].push(entry);
  });
  return grouped;
};

const buildDistricts = (): District[] => {
  const grouped = groupByDistrict();

  return Object.keys(grouped)
    .sort((a, b) => a.localeCompare(b))
    .map((districtName) => {
      const entries = grouped[districtName]
        .slice()
        .sort((a, b) => a.schoolName.localeCompare(b.schoolName));

      const blockCount = entries.length >= 20 ? 3 : entries.length >= 9 ? 2 : 1;

      const blockBuckets: { id: string; name: string; schools: School[] }[] = Array.from(
        { length: blockCount },
        (_, index) => ({
          id: `${districtName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-cluster-${index + 1}`,
          name: `Cluster ${index + 1}`,
          schools: []
        })
      );

      entries.forEach((entry) => {
        const seed = hashString(`${entry.udiseCode}-${entry.schoolName}`);
        const bucket = blockBuckets[seed % blockCount];
        bucket.schools.push(
          createSchoolFromDirectory(districtName, bucket.name, entry.udiseCode, entry.schoolName)
        );
      });

      const blocks: Block[] = blockBuckets.map((bucket) => ({
        id: bucket.id,
        name: bucket.name,
        schools: bucket.schools
          .slice()
          .sort((a, b) => a.geoIdentity.schoolName.localeCompare(b.geoIdentity.schoolName))
      }));

      return {
        id: districtName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name: districtName,
        blocks
      };
    });
};

const districts: District[] = buildDistricts();

export const stateEducationData: StateEducationData = {
  state: "Uttarakhand",
  districts
};

export const allSchools: School[] = districts.flatMap((district) =>
  district.blocks.flatMap((block) => block.schools)
);

const alertCandidates = allSchools
  .slice()
  .sort((a, b) => {
    const riskA = (a.geoIdentity.internetStatus === "ONLINE" ? 0 : 35) + (100 - a.infrastructure.healthScore);
    const riskB = (b.geoIdentity.internetStatus === "ONLINE" ? 0 : 35) + (100 - b.infrastructure.healthScore);
    return riskB - riskA;
  })
  .slice(0, 40);

export const commandAlerts: CommandAlert[] = alertCandidates.map((school, index) => {
  const severe = school.geoIdentity.internetStatus === "INACTIVE" || school.infrastructure.healthScore < 42;
  return {
    id: `AL-${String(index + 1).padStart(3, "0")}`,
    schoolId: school.id,
    schoolName: school.geoIdentity.schoolName,
    district: school.geoIdentity.district,
    severity: severe ? "RED" : "YELLOW",
    text: severe
      ? "Critical degradation detected. Immediate field intervention required."
      : "Performance drift detected. Preventive maintenance advised.",
    createdAt: schoolHoursIsoFromHoursAgo((index * 13) / 60)
  };
});
