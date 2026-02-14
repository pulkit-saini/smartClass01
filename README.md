# Uttarakhand Smart Education Monitoring Dashboard

Production-ready React + TypeScript implementation of a government command dashboard for state-level monitoring of school infrastructure, devices, applications, and live operations.

## Stack
- React 18 + TypeScript
- Vite 6
- React Router 6
- Recharts
- Plain CSS design system with light/dark mode

## Key Features Implemented
- Secure login flow with role selection:
  - `ADMIN`
  - `DISTRICT_OFFICER`
  - `BLOCK_OFFICER`
  - `VIEWER`
- Role-specific dashboards:
  - `ADMIN`: Full state command center with cross-district intelligence.
  - `DISTRICT_OFFICER`: District intelligence board with block-wise comparison and scoped alerts.
  - `BLOCK_OFFICER`: Block operations control with school connectivity watch and escalation queue.
  - `VIEWER`: Read-only analytics dashboard with operational actions disabled.
- Hierarchical drill-down:
  - State -> District -> Block -> School
- School Intelligence modules:
  - Geo-tagging and school identity panel with interactive map
  - Infrastructure monitoring and ticket status
  - Device analytics (timeline, weekly/monthly usage, health, errors)
  - App usage intelligence (distribution + trends)
  - Live communication hub (broadcast simulation)
  - User activity analytics
  - Live command center with alerts, search, and heatmap
- Theme toggle (light/dark)
- Error boundary for runtime resilience
- Typed domain model ready for backend integration

## Project Structure
```text
src/
  app/                # Root app composition
  auth/               # Auth context and session storage
  components/
    charts/           # Recharts wrappers
    common/           # Shared UI building blocks
    dashboard/        # Domain module components
  data/               # Mock state/district/block/school data
  layout/             # App shell/header
  lib/                # HTTP client + API service contracts
  pages/              # Login and dashboard pages
  routes/             # App routing + protected route
  theme/              # Theme provider
  types/              # Domain/auth TypeScript types
  utils/              # Analytics and formatting helpers
```

## Run Locally
```bash
npm install
npm run dev
```

## Production Build
```bash
npm run build
npm run preview
```

## Environment
Use `.env.example` as template:
```bash
VITE_API_BASE_URL=https://api.example.gov.in/smart-edu
VITE_APP_NAME=Uttarakhand Smart Education Command Dashboard
```

## Deploy
Dockerized deployment is included:
```bash
docker build -t smart-edu-dashboard .
docker run -p 8080:80 smart-edu-dashboard
```

## Integration Notes
- Current UI uses mock data from `src/data/mockData.ts`.
- Replace mock wiring in `src/pages/DashboardPage.tsx` with `dashboardApi` from `src/lib/services.ts`.
- Keep auth as token/JWT from backend and enforce role-based API authorization.

## Hardening Checklist for Government Deployment
- Integrate SSO/e-Governance identity provider.
- Enforce audit logging server-side for every action.
- Apply strict RBAC and API authorization at backend.
- Enable WebSocket/SSE for true real-time updates.
- Add CI gates:
  - lint
  - typecheck
  - unit tests
  - e2e tests
- Configure WAF, TLS, and secure secrets management.
