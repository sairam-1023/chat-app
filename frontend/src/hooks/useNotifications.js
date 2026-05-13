// src/hooks/useNotifications.js

import { useEffect, useState } from "react";

export function useNotifications() {
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );

  // Register service worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch(err => console.error("SW registration failed:", err));
    }
  }, []);

  async function requestPermission() {
    if (typeof Notification === "undefined") return "denied";
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }

  function notify(title, body, tag = "realchat") {
    // Read directly from browser — never stale
    const current = typeof Notification !== "undefined"
      ? Notification.permission
      : "denied";

    if (current !== "granted") return;

    // Only notify if tab is hidden or not focused
    if (document.visibilityState === "visible" && document.hasFocus()) return;

    navigator.serviceWorker.ready
      .then(reg => {
        reg.showNotification(title, {
          body,
          icon:     "/icon.svg",
          tag,
          renotify: true,
        });
      })
      .catch(() => {
        // Fallback if service worker isn't ready
        try { new Notification(title, { body, icon: "/icon.svg", tag }); }
        catch {}
      });
  }

  return { permission, requestPermission, notify };
}