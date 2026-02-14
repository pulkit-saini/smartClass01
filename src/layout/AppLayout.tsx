import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "../theme/ThemeContext";
import type { AuthUser, UserRole } from "../types/auth";

type SidebarKey =
  | "command-center"
  | "district-overview"
  | "school-intelligence"
  | "device-analytics"
  | "app-usage"
  | "communication-hub"
  | "user-activity"
  | "alerts"
  | "settings";

interface SidebarNavItem {
  key: SidebarKey;
  label: string;
  href: string;
}

const SIDEBAR_COLLAPSE_STORAGE_KEY = "smart_edu_sidebar_collapsed";

const sidebarNav: SidebarNavItem[] = [
  { key: "command-center", label: "Command Center", href: "#command-center" },
  { key: "district-overview", label: "District Overview", href: "#district-overview" },
  { key: "school-intelligence", label: "School Intelligence", href: "#school-intelligence" },
  { key: "device-analytics", label: "Device Analytics", href: "#device-analytics" },
  { key: "app-usage", label: "App Usage", href: "#app-usage" },
  { key: "communication-hub", label: "Communication Hub", href: "#communication-hub" },
  { key: "user-activity", label: "User Activity", href: "#user-activity" },
  { key: "alerts", label: "Alerts", href: "#alerts" },
  { key: "settings", label: "Settings", href: "#settings" }
];

const roleLabelByKey: Record<UserRole, string> = {
  ADMIN: "State Admin",
  DISTRICT_OFFICER: "District Admin",
  BLOCK_OFFICER: "Block Admin",
  VIEWER: "Viewer",
  HEAD_MASTER_TEACHER: "School Admin"
};

const SidebarIcon = ({ itemKey }: { itemKey: SidebarKey }) => {
  const iconClass = "sidebar-icon-svg";

  if (itemKey === "command-center") {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }

  if (itemKey === "district-overview") {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 21s6-6.1 6-11a6 6 0 1 0-12 0c0 4.9 6 11 6 11Z"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <circle cx="12" cy="10" r="2.3" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }

  if (itemKey === "school-intelligence") {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 10 12 4l9 6" stroke="currentColor" strokeWidth="1.7" />
        <path d="M5 10v10h14V10" stroke="currentColor" strokeWidth="1.7" />
        <path d="M9 20v-5h6v5" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }

  if (itemKey === "device-analytics") {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="5" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <path d="M9 20h6" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }

  if (itemKey === "app-usage") {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
        <rect x="13" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
        <rect x="4" y="13" width="16" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }

  if (itemKey === "communication-hub") {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.7" />
        <path d="M6.5 17.5a8 8 0 0 1 0-11" stroke="currentColor" strokeWidth="1.7" />
        <path d="M17.5 17.5a8 8 0 0 0 0-11" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }

  if (itemKey === "user-activity") {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 14h4l2-5 3 9 2-6h7" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }

  if (itemKey === "alerts") {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M7 10a5 5 0 1 1 10 0v4l2 3H5l2-3v-4Z"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path d="M10 20a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }

  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
};

const isMobileViewport = (): boolean => window.matchMedia("(max-width: 980px)").matches;

export const AppLayout = () => {
  const { user, logout } = useAuth();
  const { mode, toggleMode } = useTheme();
  const navigate = useNavigate();
  const role = user?.role ?? "VIEWER";
  const formattedRole = roleLabelByKey[role] ?? role.replaceAll("_", " ");
  const rawIdentity = user?.name?.trim() || "user";
  const normalizedIdentity = rawIdentity
    .toLowerCase()
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9._-]/g, "");
  const profileEmail = rawIdentity.includes("@")
    ? rawIdentity
    : `${normalizedIdentity || "user"}@ict.uk.gov.in`;
  const profileName = profileEmail
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
  const avatarInitials =
    profileName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((token) => token.charAt(0).toUpperCase())
      .join("") || "U";
  const profileImageUrl = ((user as (AuthUser & { avatarUrl?: string }) | null)?.avatarUrl ?? "").trim();
  const [activeNav, setActiveNav] = useState<SidebarKey>("command-center");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY);
    if (stored === "1") {
      setIsSidebarCollapsed(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSE_STORAGE_KEY, isSidebarCollapsed ? "1" : "0");
  }, [isSidebarCollapsed]);

  useEffect(() => {
    const syncWithHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (sidebarNav.some((item) => item.key === hash)) {
        setActiveNav(hash as SidebarKey);
      }
    };

    syncWithHash();
    window.addEventListener("hashchange", syncWithHash);
    return () => window.removeEventListener("hashchange", syncWithHash);
  }, []);

  useEffect(() => {
    if (!isMobileSidebarOpen) {
      document.body.style.overflow = "";
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileSidebarOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isMobileSidebarOpen]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 981px)");
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setIsMobileSidebarOpen(false);
      }
    };

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const handleSidebarControl = () => {
    if (isMobileViewport()) {
      setIsMobileSidebarOpen(false);
      return;
    }

    setIsSidebarCollapsed((previous) => !previous);
  };

  const handleLogout = () => {
    setIsMobileSidebarOpen(false);
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className={`app-shell ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <aside
        id="sidebar-navigation"
        className={`sidebar ${isMobileSidebarOpen ? "mobile-open" : ""} ${
          isSidebarCollapsed ? "collapsed" : ""
        }`}
      >
        <div className="sidebar-top">
          <div className="sidebar-profile" title={isSidebarCollapsed ? profileEmail : undefined}>
            {profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt={`${profileName || "User"} profile`}
                className="sidebar-profile-avatar"
              />
            ) : (
              <span className="sidebar-profile-avatar sidebar-profile-avatar-fallback" aria-hidden="true">
                {avatarInitials}
              </span>
            )}

            <div className="sidebar-profile-meta">
              {profileName ? <p className="sidebar-profile-name">{profileName}</p> : null}
              <p className="sidebar-profile-email" title={profileEmail}>
                {profileEmail}
              </p>
            </div>
          </div>

          <div className="sidebar-user-meta">
            <span className="sidebar-role">{formattedRole}</span>
          </div>

          <button
            className={`sidebar-theme-toggle ${mode === "dark" ? "active" : ""}`}
            type="button"
            onClick={toggleMode}
          >
            <span className="sidebar-theme-label">Dark Mode</span>
            <span className="sidebar-theme-switch">
              <span className="sidebar-theme-knob" />
            </span>
          </button>

          <nav className="sidebar-nav">
            {sidebarNav.map((item) => (
              <a
                key={item.key}
                href={item.href}
                title={isSidebarCollapsed ? item.label : undefined}
                className={`sidebar-link ${activeNav === item.key ? "active" : ""}`}
                aria-current={activeNav === item.key ? "page" : undefined}
                onClick={() => {
                  setActiveNav(item.key);
                  if (isMobileViewport()) {
                    setIsMobileSidebarOpen(false);
                  }
                }}
              >
                <span className="sidebar-icon-wrap">
                  <SidebarIcon itemKey={item.key} />
                </span>
                <span className="sidebar-link-label">{item.label}</span>
              </a>
            ))}
          </nav>
        </div>

        <button
          type="button"
          className="sidebar-edge-toggle"
          aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={handleSidebarControl}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </button>

        <div className="sidebar-footer">
          <button className="sidebar-logout-btn" type="button" onClick={handleLogout}>
            <svg className="sidebar-icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M10 17 15 12 10 7" stroke="currentColor" strokeWidth="1.8" />
              <path d="M15 12H4" stroke="currentColor" strokeWidth="1.8" />
              <path d="M13 4h6v16h-6" stroke="currentColor" strokeWidth="1.8" />
            </svg>
            <span className="sidebar-link-label">Logout</span>
          </button>
        </div>
      </aside>

      <button
        type="button"
        className={`sidebar-backdrop ${isMobileSidebarOpen ? "visible" : ""}`}
        aria-hidden={!isMobileSidebarOpen}
        tabIndex={isMobileSidebarOpen ? 0 : -1}
        onClick={() => setIsMobileSidebarOpen(false)}
      />

      <div className="app-content-wrap">
        <button
          type="button"
          className="mobile-menu-btn"
          aria-label={isMobileSidebarOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isMobileSidebarOpen}
          aria-controls="sidebar-navigation"
          onClick={() => setIsMobileSidebarOpen((previous) => !previous)}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </button>

        <main id="settings" className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
