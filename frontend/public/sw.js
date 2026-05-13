// public/sw.js
// Service Worker — handles push notification display
// This file must be in /public so it's served at the root URL

self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};
  self.registration.showNotification(data.title || "RealChat", {
    body:  data.body  || "You have a new notification",
    icon:  data.icon  || "/icon.png",
    badge: data.badge || "/icon.png",
    tag:   data.tag   || "realchat",
    data:  { url: data.url || "/" },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url && "focus" in client) return client.focus();
      }
      // Otherwise open a new tab
      if (clients.openWindow) return clients.openWindow("/");
    })
  );
});