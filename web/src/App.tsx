import { useRouteMeta } from './hooks/usePageMeta';
import { BrowserRouter, Navigate, Routes, Route, useLocation, useParams } from 'react-router-dom';
import NotFoundPage from './pages/NotFoundPage';
import { AuthProvider } from './context/AuthContext';
import { ShopContextProvider } from './context/ShopContext';
import { ShopRouteProvider } from './context/ShopContext';
import ShopGate from './components/ShopGate';
import OwnerRoute from './components/OwnerRoute';
import { ThemeProvider } from './context/ThemeContext';
import { PaletteProvider } from './context/PaletteContext';
import { LanguageProvider } from './context/LanguageContext';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import AppSidebarLayout from './components/AppSidebarLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import VerifyEmailChangePage from './pages/VerifyEmailChangePage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import HomePage from './pages/HomePage';
import AccountPage from './pages/AccountPage';
import ShopNewPage from './pages/ShopNewPage';
import ShopOverviewPage from './pages/ShopOverviewPage';
import ShopBookingsPage from './pages/ShopBookingsPage';
import ShopNewBookingPage from './pages/ShopNewBookingPage';
import ShopServicesPage from './pages/ShopServicesPage';
import ShopTeamPage from './pages/ShopTeamPage';
import ShopTeamMemberPage from './pages/ShopTeamMemberPage';
import ShopCustomersPage from './pages/ShopCustomersPage';
import ShopCustomerDetailPage from './pages/ShopCustomerDetailPage';
import ShopSettingsPage from './pages/ShopSettingsPage';
import AcceptInvitePage from './pages/AcceptInvitePage';
import PublicPage from './pages/PublicPage';
import CancelBookingPage from './pages/CancelBookingPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import DpaPage from './pages/DpaPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import ScrollToTop from './components/ScrollToTop';
import { publicShopPath } from './utils/publicLink';

// Old public links (/p/<slug>) live in QR codes, messages and bookmarks.
function LegacyPublicRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const { search } = useLocation();
  return <Navigate to={`${publicShopPath(slug ?? '')}${search}`} replace />;
}

function RouteMeta() {
  useRouteMeta();
  return null;
}

export default function App() {
  return (
    <ThemeProvider>
      <PaletteProvider>
      <LanguageProvider>
        <BrowserRouter>
          <ScrollToTop />
          <RouteMeta />
          <AuthProvider>
            <ShopContextProvider>
              <Routes>
                <Route path="/" element={<HomePage />} />

                <Route element={<PublicRoute />}>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                </Route>

                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route path="/verify-email-change" element={<VerifyEmailChangePage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/invite" element={<AcceptInvitePage />} />
                <Route path="/cancel" element={<CancelBookingPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/dpa" element={<DpaPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/p/:slug" element={<LegacyPublicRedirect />} />

                <Route element={<ProtectedRoute />}>
                  <Route element={<AppSidebarLayout />}>
                    {/* Outside a shop. /dashboard is the only list of shops and invites. */}
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/shops/new" element={<ShopNewPage />} />
                    <Route path="/account" element={<AccountPage />} />

                    <Route path="/shops/:slug" element={<ShopRouteProvider />}>
                      <Route element={<ShopGate />}>
                        <Route index element={<ShopOverviewPage />} />
                        <Route path="bookings" element={<ShopBookingsPage />} />
                        <Route path="services" element={<ShopServicesPage />} />
                        <Route element={<OwnerRoute />}>
                          <Route path="bookings/new" element={<ShopNewBookingPage />} />
                          <Route path="team" element={<ShopTeamPage />} />
                          <Route path="team/:memberId" element={<ShopTeamMemberPage />} />
                          <Route path="customers" element={<ShopCustomersPage />} />
                          <Route path="customers/:customerId" element={<ShopCustomerDetailPage />} />
                          <Route path="settings" element={<ShopSettingsPage />} />
                        </Route>
                      </Route>
                    </Route>
                  </Route>
                </Route>

                {/* Last on purpose: static routes above always win, and slugs can't
                    collide with them (API RESERVED_SLUGS). Unknown -> NotFoundPage. */}
                <Route path="/:slug" element={<PublicPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </ShopContextProvider>
          </AuthProvider>
        </BrowserRouter>
      </LanguageProvider>
      </PaletteProvider>
    </ThemeProvider>
  );
}