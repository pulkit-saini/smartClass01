export type StatusColor = "GREEN" | "YELLOW" | "RED";
export type SchoolConnectionStatus = "ONLINE" | "OFFLINE" | "INACTIVE";

export interface AppUsageSlice {
  name: string;
  minutes: number;
}

export interface TimeSeriesPoint {
  label: string;
  value: number;
}

export interface TimelinePoint {
  slot: string;
  active: number;
}

export interface MaintenanceTicket {
  id: string;
  category: "INTERNET" | "POWER" | "HARDWARE" | "DEVICE";
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  raisedAt: string;
}

export interface SchoolInfrastructure {
  smartClassroomInstalled: boolean;
  deviceInstalled: boolean;
  internetConnectivity: boolean;
  electricityAvailability: boolean;
  hardwareCondition: "GOOD" | "FAIR" | "CRITICAL";
  healthScore: number;
  tickets: MaintenanceTicket[];
}

export interface DeviceAnalytics {
  dailyUsageHours: number;
  activeHours: number;
  idleHours: number;
  offlineDurationHours: number;
  deviceHealth: "HEALTHY" | "WARNING" | "CRITICAL";
  lastRestart: string;
  errorLogs: string[];
  onOffTimeline: TimelinePoint[];
  weeklyUsage: TimeSeriesPoint[];
  monthlyUsage: TimeSeriesPoint[];
}

export interface ApplicationAnalytics {
  usageDistribution: AppUsageSlice[];
  educationalPercent: number;
  nonEducationalPercent: number;
  totalScreenTimeHours: number;
  trend: TimeSeriesPoint[];
  topUsedApps: string[];
  unusualAlerts: string[];
}

export interface UserActivity {
  loginFrequencyWeekly: TimeSeriesPoint[];
  sessionDurationMinutes: TimeSeriesPoint[];
  activeOperators: number;
  inactiveSchoolsDetected: number;
  behaviorSummary: string;
}

export interface BroadcastMessage {
  id: string;
  type: "TEXT" | "PDF" | "AUDIO" | "IMAGE" | "VIDEO" | "EMERGENCY";
  title: string;
  sentAt: string;
}

export interface SchoolCommunication {
  liveAccessEnabled: boolean;
  cameraAccessEnabled: boolean;
  broadcastHistory: BroadcastMessage[];
}

export interface SchoolGeoIdentity {
  schoolName: string;
  udiseCode: string;
  address: string;
  district: string;
  block: string;
  latitude: number;
  longitude: number;
  internetStatus: SchoolConnectionStatus;
  powerStatus: "ON" | "OFF";
  lastDeviceSync: string;
  lastActivity: string;
}

export interface School {
  id: string;
  geoIdentity: SchoolGeoIdentity;
  infrastructure: SchoolInfrastructure;
  deviceAnalytics: DeviceAnalytics;
  appAnalytics: ApplicationAnalytics;
  communication: SchoolCommunication;
  userActivity: UserActivity;
}

export interface Block {
  id: string;
  name: string;
  schools: School[];
}

export interface District {
  id: string;
  name: string;
  blocks: Block[];
}

export interface StateEducationData {
  state: string;
  districts: District[];
}

export interface CommandAlert {
  id: string;
  schoolId: string;
  schoolName: string;
  district: string;
  severity: StatusColor;
  text: string;
  createdAt: string;
}
