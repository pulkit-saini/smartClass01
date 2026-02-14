import { AppRouter } from "../routes/AppRouter";
import { AuthProvider } from "../auth/AuthContext";
import { ThemeProvider } from "../theme/ThemeContext";
import { ErrorBoundary } from "../components/common/ErrorBoundary";

export const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ErrorBoundary>
          <AppRouter />
        </ErrorBoundary>
      </AuthProvider>
    </ThemeProvider>
  );
};
