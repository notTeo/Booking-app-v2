import { BrowserRouter, Routes, Route } from 'react-router-dom';
import NotFoundPage from './pages/NotFoundPage';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import VerifyEmailChangePage from './pages/VerifyEmailChangePage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import HomePage from './pages/HomePage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import PricingPage from './pages/PricingPage'
import AboutPage from './pages/AboutPage'
import BillingPage from './pages/BillingPage';
import SettingsPage from './pages/SettingsPage';
import ShopsPage from './pages/ShopsPage';
import ShopNewPage from './pages/ShopNewPage';
import ShopDetailPage from './pages/ShopDetailPage';


export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <BrowserRouter>
          <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/about" element={<AboutPage />} />

          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>

          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/verify-email-change" element={<VerifyEmailChangePage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/oauth/callback" element={<OAuthCallbackPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/shops" element={<ShopsPage />} />
              <Route path="/shops/new" element={<ShopNewPage />} />
              <Route path="/shops/:slug" element={<ShopDetailPage />} />
              <Route path="/billing" element={<BillingPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
        </BrowserRouter>
      </LanguageProvider>
    </ThemeProvider>
  );
}
