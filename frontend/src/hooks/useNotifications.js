// src/hooks/useNotifications.js
// Manages browser notification permission + showing notifications

import { useEffect, useState } from "react";

export function useNotifications() {
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );

  // Register service worker on mount
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch(err => console.error("SW registration failed:", err));
    }
  }, []);

  // Ask user for permission
  async function requestPermission() {
    if (typeof Notification === "undefined") return "denied";
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }

  // Show a notification (only if tab is not focused)
  function notify(title, body, tag = "realchat") {
    if (permission !== "granted") return;
    if (document.visibilityState === "visible") return; // tab is active, skip

    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      // Use service worker (works even when tab is closed on mobile)
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification(title, {
          body,
          icon:  "/icon.png",
          badge: "/icon.png",
          tag,
          renotify: true,
        });
      });
    } else {
      // Fallback: basic Notification API
      new Notification(title, { body, icon: "/icon.png", tag });
    }
  }

  return { permission, requestPermission, notify };
}