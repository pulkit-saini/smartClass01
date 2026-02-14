import type { School, SchoolConnectionStatus } from "../types/domain";

export const SCHOOL_DAY_START_HOUR = 8;
export const SCHOOL_DAY_END_HOUR = 16;

export const clampToSchoolHours = (value: Date): Date => {
  const timestamp = new Date(value);
  const totalMinutes = timestamp.getHours() * 60 + timestamp.getMinutes();
  const startMinutes = SCHOOL_DAY_START_HOUR * 60;
  const endMinutes = SCHOOL_DAY_END_HOUR * 60;

  if (totalMinutes < startMinutes) {
    timestamp.setHours(SCHOOL_DAY_START_HOUR, 0, 0, 0);
  } else if (totalMinutes > endMinutes) {
    timestamp.setHours(SCHOOL_DAY_END_HOUR, 0, 0, 0);
  }

  return timestamp;
};

export const schoolHoursIsoFromHoursAgo = (hoursAgo: number): string =>
  clampToSchoolHours(new Date(Date.now() - hoursAgo * 60 * 60 * 1000)).toISOString();

export const schoolHoursIsoNow = (): string => clampToSchoolHours(new Date()).toISOString();

export const formatDateTime = (iso: string): string =>
  clampToSchoolHours(new Date(iso)).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  });

export const statusToColor = (
  status: SchoolConnectionStatus | "ON" | "OFF"
): "GREEN" | "YELLOW" | "RED" => {
  if (status === "ONLINE" || status === "ON") {
    return "GREEN";
  }
  if (status === "OFFLINE") {
    return "YELLOW";
  }
  return "RED";
};

export const computeStateSummary = (schools: School[]) => {
  const totalSchools = schools.length;
  const online = schools.filter((school) => school.geoIdentity.internetStatus === "ONLINE").length;
  const offline = schools.filter((school) => school.geoIdentity.internetStatus === "OFFLINE").length;
  const inactive = schools.filter((school) => school.geoIdentity.internetStatus === "INACTIVE").length;
  const avgHealthScore = Math.round(
    schools.reduce((sum, school) => sum + school.infrastructure.healthScore, 0) /
      Math.max(totalSchools, 1)
  );

  return {
    totalSchools,
    online,
    offline,
    inactive,
    avgHealthScore
  };
};

export const buildMapEmbedUrl = (lat: number, lng: number): string => {
  return `https://maps.google.com/maps?q=${lat},${lng}&z=14&output=embed`;
};
