import { createContext, useContext, useState, useEffect, useCallback } from "react";
import API from "../core/utils/api_client";
import { ENDPOINTS } from "../core/constants/api_endpoint";

const mapResponseToUser = (r) => ({
  id: r?.id,
  username: r?.username,
  firstName: r?.first_name,
  lastName: r?.last_name,
  email: r?.email,
  phone: r?.phone,
  groupId: r?.group_id,
  role: r?.role ?? "user",
  isAktif: r?.is_aktif,
  isEmailVerified: r?.is_email_verified,
  subscribeNewsletter: r?.subscribe_newsletter,
  createdAt: r?.created_at ?? r?.createdAt,
});

// Ekstraksi pesan error dari berbagai kemungkinan bentuk response backend.
// Ditambahkan lebih banyak fallback + logging supaya gampang ketahuan
// kalau ada bentuk response baru yang belum tertangani.
const extractErrorMessage = (err) => {
  if (typeof err === "string") return err;

  const msg =
    err?.response?.data?.message ||
    err?.response?.data?.error?.message ||
    err?.response?.data?.error ||
    err?.response?.data?.errors?.[0]?.message ||
    err?.response?.data?.errors?.[0] ||
    err?.data?.message ||
    err?.message ||
    (err?.response?.status
      ? `Terjadi kesalahan pada server (status ${err.response.status})`
      : null) ||
    "Terjadi kesalahan pada server. Silakan coba lagi.";

  // Debugging: kalau bentuk error tidak dikenali, tampilkan di console
  // supaya mudah ditelusuri bentuk response asli dari backend/api_client.
  if (process.env.NODE_ENV !== "production") {
    console.error("[UserProvider] Error captured:", err);
  }

  return msg;
};

export const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  // Terpisah dari `loading`: hanya untuk pengecekan sesi sekali di awal load app.
  // Guard rute (GuestGuard/AdminGuard) HARUS pakai ini, bukan `loading`, supaya
  // komponen seperti Register/Login tidak ke-unmount tiap kali ada aksi async
  // (yang men-toggle `loading`) sedang berjalan.
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState("");

  const clearError = useCallback(() => setError(""), []);

  const logoutUser = useCallback(async () => {
    try {
      // Beri tahu server supaya token_version user naik — token lama (termasuk
      // yang mungkin sudah bocor/dicuri) langsung ditolak di request berikutnya,
      // bukan cuma dihapus dari browser ini saja.
      await API.post(ENDPOINTS.LOGOUT);
    } catch {
      // Tetap lanjut hapus sesi lokal walau request ke server gagal
      // (mis. sudah offline) — jangan sampai user tidak bisa logout.
    } finally {
      localStorage.removeItem("token");
      setUser(null);
      setError("");
    }
  }, []);

  const hasRole = useCallback(
    (...roles) => {
      return roles.includes(user?.role);
    },
    [user]
  );

  const isAdmin = user?.role === "admin";
  const isDeveloper = user?.role === "developer";

  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const data = await API.get(ENDPOINTS.GET_PROFILE);
          setUser(mapResponseToUser(data));
        } catch {
          logoutUser();
        }
      }
      setInitializing(false);
    };
    checkSession();
  }, [logoutUser]);

  const registerUser = async (formData) => {
    setLoading(true);
    setError("");
    try {
      const data = await API.post(ENDPOINTS.REGISTER, formData);

      if (process.env.NODE_ENV !== "production") {
        console.log("[UserProvider] registerUser response:", data);
      }

      return { success: true, data };
    } catch (err) {
      const msg = extractErrorMessage(err);
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  const loginUser = async (email, password) => {
    setLoading(true);
    setError("");
    try {
      const data = await API.post(ENDPOINTS.LOGIN_EMAIL, { email, password });
      const accessToken =
        data?.accessToken ||
        data?.token ||
        data?.access_token ||
        data?.data?.accessToken ||
        data?.data?.token;
      const userData = data?.user || data?.data?.user || data?.data;

      if (!accessToken) throw new Error("Token tidak ditemukan dalam respons server");

      localStorage.setItem("token", accessToken);
      const mappedUser = mapResponseToUser(userData);
      setUser(mappedUser);
      return { success: true, user: mappedUser };
    } catch (err) {
      const msg = extractErrorMessage(err);
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  const loginWithUsername = async (username, password) => {
    setLoading(true);
    setError("");
    try {
      const data = await API.post(ENDPOINTS.LOGIN_USERNAME, { username, password });
      const accessToken =
        data?.accessToken ||
        data?.token ||
        data?.access_token ||
        data?.data?.accessToken ||
        data?.data?.token;
      const userData = data?.user || data?.data?.user || data?.data;

      if (!accessToken) throw new Error("Token tidak ditemukan dalam respons server");

      localStorage.setItem("token", accessToken);
      const mappedUser = mapResponseToUser(userData);
      setUser(mappedUser);
      return { success: true, user: mappedUser };
    } catch (err) {
      const msg = extractErrorMessage(err);
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  const verifyEmail = async (token, email) => {
    setLoading(true);
    setError("");
    try {
      await API.get(`${ENDPOINTS.VERIFY_EMAIL}?token=${token}&email=${email}`);
      return { success: true };
    } catch (err) {
      const msg = extractErrorMessage(err);
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async (email) => {
    setLoading(true);
    setError("");
    try {
      await API.post(ENDPOINTS.RESEND_VERIFICATION, { email });
      return { success: true };
    } catch (err) {
      const msg = extractErrorMessage(err);
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (formData) => {
    setLoading(true);
    setError("");
    try {
      const data = await API.put(ENDPOINTS.UPDATE_USER, formData);
      setUser(mapResponseToUser(data));
      return { success: true };
    } catch (err) {
      const msg = extractErrorMessage(err);
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (email) => {
    setLoading(true);
    setError("");
    try {
      // Backend hanya mengirim OTP ke email & balas {status:'success'}, tidak ada
      // token di response ini — jangan syaratkan field yang memang tidak dikirim.
      await API.post(ENDPOINTS.FORGOT_PASSWORD, { email });
      return { success: true };
    } catch (err) {
      const msg = extractErrorMessage(err);
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (email, otp) => {
    setLoading(true);
    setError("");
    try {
      const data = await API.post(ENDPOINTS.VERIFY_OTP, { email, otp });
      return { success: true, resetToken: data?.resetToken };
    } catch (err) {
      const msg = extractErrorMessage(err);
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async ({ resetToken, newPassword }) => {
    setLoading(true);
    setError("");
    try {
      await API.post(ENDPOINTS.RESET_PASSWORD, {
        reset_token: resetToken,
        new_password: newPassword,
      });
      return { success: true };
    } catch (err) {
      const msg = extractErrorMessage(err);
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        initializing,
        error,
        isAuthenticated: !!user,
        isAdmin,
        isDeveloper,
        hasRole,
        registerUser,
        loginUser,
        loginWithUsername,
        logoutUser,
        updateProfile,
        verifyEmail,
        resendVerification,
        forgotPassword,
        verifyOtp,
        resetPassword,
        setError,
        clearError,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser harus digunakan di dalam UserProvider");
  return context;
};