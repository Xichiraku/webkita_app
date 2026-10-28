import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8787/api";

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 15000,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // --- PERBAIKAN UTAMA ---
    // Sebelumnya di sini langsung `Promise.reject(message)` dengan string saja,
    // sehingga SEMUA detail error (status code, response body asli, apakah ini
    // network error / timeout / CORS, dsb) hilang. Ini bikin pesan error jadi
    // generik terus ("Koneksi ke server gagal") walau sebenarnya backend
    // menolak request dengan alasan spesifik (misal validasi, email sudah
    // terdaftar, dll), dan menyulitkan debugging.
    //
    // Sekarang kita tetap reject dengan sebuah Error object, TAPI kita
    // lampirkan `.response` aslinya supaya extractErrorMessage() di
    // user_provider.js bisa membaca detail pesan dari backend.

    if (import.meta.env.DEV) {
      // Log detail lengkap untuk debugging: cek tab Console browser saat
      // request gagal untuk melihat status code & body response asli.
      console.error('[API] Request failed:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        responseData: error.response?.data,
        message: error.message,
        isNetworkError: !error.response,
      });
    }

    let friendlyMessage;
    if (error.response) {
      // Server merespons, tapi dengan status error (4xx/5xx)
      friendlyMessage =
        error.response.data?.message ||
        error.response.data?.error ||
        `Permintaan gagal (status ${error.response.status})`;
    } else if (error.code === 'ECONNABORTED') {
      // Timeout
      friendlyMessage = 'Permintaan ke server terlalu lama (timeout). Silakan coba lagi.';
    } else if (error.request) {
      // Request terkirim tapi tidak ada respons sama sekali
      // (biasanya: masalah jaringan, server down, atau CORS diblokir browser)
      friendlyMessage = 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
    } else {
      friendlyMessage = error.message || 'Terjadi kesalahan yang tidak diketahui.';
    }

    const normalizedError = new Error(friendlyMessage);
    normalizedError.response = error.response; // tetap bawa response asli
    normalizedError.status = error.response?.status;
    normalizedError.isNetworkError = !error.response;

    return Promise.reject(normalizedError);
  }
);

const API = {
  get: (url, config) => apiClient.get(url, config).then((res) => res.data),
  post: (url, data, config) => apiClient.post(url, data, config).then((res) => res.data),
  put: (url, data, config) => apiClient.put(url, data, config).then((res) => res.data),
  patch: (url, data, config) => apiClient.patch(url, data, config).then((res) => res.data),
  delete: (url, config) => apiClient.delete(url, config).then((res) => res.data),
};

export default API;