import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').then(registration => {
      console.log('ServiceWorker registration successful');
    }).catch(error => {
      console.log('ServiceWorker registration failed:', error);
    });
  });
}

// Register the app with the DOM
createRoot(document.getElementById("root")!).render(<App />);
