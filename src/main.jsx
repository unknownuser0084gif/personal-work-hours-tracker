import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { HashRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import "@fontsource-variable/vazirmatn";
import "./styles/index.css";
import { store } from "./store/index.js";
import App from "./App.jsx";
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <HashRouter>
        <App />
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              fontFamily: "Vazirmatn Variable",
              direction: "rtl",
              borderRadius: "14px",
            },
          }}
        />
      </HashRouter>
    </Provider>
  </React.StrictMode>,
);
