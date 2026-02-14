import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import type { UserRole } from "../types/auth";
import ukGovLogo from "../../iamges/Uk gov logo.svg";
import leaderPMModi from "../../iamges/PM_Modi-clean.png";
import leaderPushkarDhami from "../../iamges/Pushkar_Dhami-removebg-preview.png";
import leaderDhanSinghRawat from "../../iamges/Dhan_Singh_Rawat-removebg-preview.png";
import leaderGurmitSingh from "../../iamges/GurmitSingh-removebg-preview.png";


const roleOptions: { label: string; value: UserRole }[] = [
  { label: "State Admin", value: "ADMIN" },
  { label: "District Admin", value: "DISTRICT_OFFICER" },
  { label: "Block Admin", value: "BLOCK_OFFICER" },
  { label: "School Admin", value: "HEAD_MASTER_TEACHER" }
];

export const LoginPage = () => {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("ADMIN");
  const [error, setError] = useState("");

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const ok = await login({ username, password, role });
    if (!ok) {
      setError("Please provide valid login details.");
      return;
    }
    navigate("/");
  };

  return (
    <div className="login-shell login-shell-gov">
      <div className="login-bg-glow" />

      <div className="login-side-visual login-side-left" aria-hidden="true">
        <div className="login-side-portrait login-side-portrait-outer login-side-portrait-pm">
          <img src={leaderPMModi} alt="" loading="lazy" />
        </div>
        <div className="login-side-portrait login-side-portrait-inner login-side-portrait-gurmit">
          <img src={leaderGurmitSingh} alt="" loading="lazy" />
        </div>
      </div>
      <div className="login-side-visual login-side-right" aria-hidden="true">
        <div className="login-side-portrait login-side-portrait-outer login-side-portrait-pushkar">
          <img src={leaderPushkarDhami} alt="" loading="lazy" />
        </div>
        <div className="login-side-portrait login-side-portrait-inner login-side-portrait-rawat">
          <img src={leaderDhanSinghRawat} alt="" loading="lazy" />
        </div>
      </div>

      <div className="login-card login-card-gov">
        <div className="login-card-head">
          <div className="login-logo-inline">
            <img src={ukGovLogo} alt="Government of Uttarakhand logo" />
          </div>
          <p className="overline">DIGITAL GOVERNANCE PLATFORM</p>
          <h1>Uttarakhand Smart Education Command Center</h1>
          <p className="section-hint">Secure role-based access for authorized government officials.</p>
        </div>

        <form onSubmit={onSubmit} className="login-form">
          <label>
            Username
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="official.id"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="********"
            />
          </label>
          <label>
            Role
            <select value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {error ? <p className="error-text">{error}</p> : null}
          <button type="submit" className="primary-btn gov-login-btn">
            <span className="gov-login-lock" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M7 11V8.5a5 5 0 1 1 10 0V11"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <rect
                  x="5"
                  y="11"
                  width="14"
                  height="10"
                  rx="2.4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <circle cx="12" cy="16" r="1.2" fill="currentColor" />
              </svg>
            </span>
            Secure Login
          </button>
        </form>

        <p className="login-card-footer">Government of Uttarakhand - ICT Operations</p>
      </div>
    </div>
  );
};
