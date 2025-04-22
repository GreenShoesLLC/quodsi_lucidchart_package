// src/index.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./styles/quodsi-styles.css";
import reportWebVitals from "./reportWebVitals";

// import App from './App'; // Original version
import App from './refactored_app'; // Refactored version
console.log("index.tsx - Application entry point");

// Create the root element to render the application
const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

// Render the application with StrictMode for better development experience
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Report web vitals for performance monitoring
reportWebVitals();
