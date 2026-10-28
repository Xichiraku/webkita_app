import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource-variable/plus-jakarta-sans";
import App from "./page/screen/App.jsx";
import "./index.css";

// Penanda bahwa JS aktif → animasi .reveal hanya berjalan bila JS jalan
document.documentElement.classList.add("js");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
