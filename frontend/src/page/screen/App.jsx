import React, { useEffect, useState } from "react";
import { Routes, Route, useNavigate, Navigate, useLocation } from "react-router-dom";
import Layout from "../../components/Layout";
import PageLoader from "../../components/ui/Spinner";
import { UserProvider, useUser } from "../../provider/user_provider.jsx";
import { ProjectProvider } from "../../provider/project_provider.jsx";
import { PaymentProvider } from "../../provider/payment_provider.jsx";
import Home from "../home/Home";
import Login from "../auth/Login";
import Register from "../auth/Register";
import ProfilePage from "../profile/ProfilePage";
import CaraKerja from "../CaraKerja";
import InvoicePage from "../InvoicePage";
import Harga from "../Harga";
import Orderan from "../Orderan";
import InformasiDetail from "../InformasiDetail";
import VerifyEmail from "../auth/VerifyEmail";
import ResetPassword from "../auth/ResetPassword";
import ForgotPassword from "../auth/ForgotPassword";
import VerifyOTP from "../auth/VerifyOTP";
import AdminDashboard from "../admin/AdminDashboard";

const ADMIN_ROLES = ["admin", "developer"];

const Spinner = () => <PageLoader className="min-h-screen" label="Memuat…" />;

// Guard: hanya admin & developer
// Pakai `initializing` (bukan `loading`), supaya guard ini tidak ikut ke-trigger
// setiap kali ada aksi form async (login/register/dst) sedang berjalan —
// kalau pakai `loading`, komponen anak (mis. Register) akan ke-unmount lalu
// mount ulang di tengah proses submit, sehingga state lokalnya (popup sukses,
// pesan error) hilang begitu saja.
const AdminGuard = ({ children }) => {
  const { user, initializing } = useUser();
  if (initializing) return <Spinner />;
  if (!user || !ADMIN_ROLES.includes(user.role)) return <Navigate to="/login" replace />;
  return children;
};

const GuestGuard = ({ children }) => {
  const { user, initializing } = useUser();
  if (initializing) return <Spinner />;
  if (user && ADMIN_ROLES.includes(user.role)) return <Navigate to="/admin" replace />;
  if (user) return <Navigate to="/" replace />;
  return children;
};

// Halaman yang butuh login (orderan, profil, form pesan, invoice)
const AuthGuard = ({ children }) => {
  const { user, initializing } = useUser();
  if (initializing) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const AdminRedirect = ({ children }) => {
  const { user, initializing } = useUser();
  if (initializing) return <Spinner />;
  if (user && ADMIN_ROLES.includes(user.role)) return <Navigate to="/admin" replace />;
  return children;
};

// Scroll ke atas setiap pindah halaman (kecuali tautan #hash)
const ScrollToTop = () => {
  const { pathname, hash } = useLocation();
  useEffect(() => { if (!hash) window.scrollTo(0, 0); }, [pathname, hash]);
  return null;
};

function AppRoutes() {
  const navigate = useNavigate();

  const [selectedPlanDetails, setSelectedPlanDetails] = useState(() => {
    try {
      const saved = sessionStorage.getItem("selectedPlan");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [forgotData, setForgotData] = useState({ email: "" });
  const [verifiedData, setVerifiedData] = useState({ resetToken: "", email: "" });

  const handleNavigateToDetail = (plan) => {
    setSelectedPlanDetails(plan);
    try { sessionStorage.setItem("selectedPlan", JSON.stringify(plan)); } catch { /* abaikan */ }
    navigate("/informasidetail");
  };

  const handleOTPSent = ({ email }) => {
    setForgotData({ email });
    navigate("/otp-password");
  };

  const handleOTPVerified = ({ resetToken, email }) => {
    setVerifiedData({ resetToken, email });
    navigate("/reset-password");
  };

  const clearPlan = () => {
    try { sessionStorage.removeItem("selectedPlan"); } catch { /* abaikan */ }
    setSelectedPlanDetails(null);
  };

  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* ── Admin ── */}
        <Route path="/admin/*" element={<AdminGuard><AdminDashboard /></AdminGuard>} />

        {/* ── Auth ── */}
        <Route path="/login" element={
          <GuestGuard>
            <Login
              onBackToHome={() => navigate("/")}
              onForgotPassword={() => navigate("/forgot-password")}
              onGoToRegister={() => navigate("/register")}
              onGoToAdmin={() => navigate("/admin")}
            />
          </GuestGuard>
        } />
        <Route path="/register" element={
          <GuestGuard>
            <Register onBackToHome={() => navigate("/")} onGoToLogin={() => navigate("/login")} />
          </GuestGuard>
        } />
        <Route path="/forgot-password" element={
          <ForgotPassword onBackToLogin={() => navigate("/login")} onOTPSent={handleOTPSent} />
        } />
        <Route path="/otp-password" element={
          <VerifyOTP email={forgotData.email} onBackToForgot={() => navigate("/forgot-password")} onOTPVerified={handleOTPVerified} />
        } />
        <Route path="/reset-password" element={
          <ResetPassword
            resetToken={verifiedData.resetToken}
            email={verifiedData.email}
            onBackToVerify={() => navigate("/otp-password")}
            onSuccess={() => navigate("/login")}
          />
        } />

        {/* ── Verifikasi email (halaman mandiri) ── */}
        <Route path="/auth/verify-email" element={<VerifyEmail onGoToLogin={() => navigate("/login")} />} />

        {/* ── Invoice (halaman mandiri, tanpa navbar/footer agar rapi saat dicetak) ── */}
        <Route path="/invoice/:projectId" element={<AuthGuard><InvoicePage /></AuthGuard>} />

        {/* ── Publik dengan Layout ── */}
        <Route path="*" element={
          <AdminRedirect>
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/carakerja" element={<CaraKerja onBackToHome={() => navigate("/")} />} />
                <Route path="/harga" element={<Harga onSelectPlan={handleNavigateToDetail} />} />
                <Route path="/orderan" element={<AuthGuard><Orderan /></AuthGuard>} />
                <Route path="/profile" element={<AuthGuard><ProfilePage /></AuthGuard>} />
                <Route path="/informasidetail" element={
                  <AuthGuard>
                    <InformasiDetail
                      plan={selectedPlanDetails}
                      onBackToHome={() => { clearPlan(); navigate("/"); }}
                      onBackToHarga={() => { clearPlan(); navigate("/harga"); }}
                    />
                  </AuthGuard>
                } />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Layout>
          </AdminRedirect>
        } />
      </Routes>
    </>
  );
}

function App() {
  return (
    <UserProvider>
      <ProjectProvider>
        <PaymentProvider>
          <AppRoutes />
        </PaymentProvider>
      </ProjectProvider>
    </UserProvider>
  );
}

export default App;
