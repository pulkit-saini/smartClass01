import { http } from "./http";
import type { CommandAlert, School, StateEducationData } from "../types/domain";

export interface DashboardApi {
  getStateHierarchy: () => Promise<StateEducationData>;
  getSchoolSnapshot: (schoolId: string) => Promise<School>;
  getCommandAlerts: () => Promise<CommandAlert[]>;
}

export const dashboardApi: DashboardApi = {
  getStateHierarchy: () => http<StateEducationData>("/v1/hierarchy"),
  getSchoolSnapshot: (schoolId) => http<School>(`/v1/schools/${schoolId}`),
  getCommandAlerts: () => http<CommandAlert[]>("/v1/alerts")
};
