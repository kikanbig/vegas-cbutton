import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const SWUpdateNotifier = () => {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const setupSW = async () => {
      const registration = await navigator.serviceWorker.ready;

      const checkWaiting = () => {
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
        }
      };

      // Check if there's already a waiting worker
      checkWaiting();

      // Listen for new updates
      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            setWaitingWorker(installing);
          }
        });
      });

      // Force check for updates on launch
      try {
        await registration.update();
        // After update() resolves, the new SW may already be waiting
        // Give it a moment to transition to "installed"
        setTimeout(checkWaiting, 1500);
      } catch {}

      // In standalone (installed PWA) mode, periodically check
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as any).standalone === true;

      if (isStandalone) {
        setInterval(() => {
          registration.update().then(checkWaiting).catch(() => {});
        }, 60_000);
      }
    };

    setupSW();

    // Reload when the new SW takes over
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, []);

  useEffect(() => {
    if (!waitingWorker) return;

    toast("🚀 Доступно обновление приложения!", {
      duration: Infinity,
      icon: <RefreshCw className="w-5 h-5 text-white animate-spin" />,
      style: {
        background: "linear-gradient(135deg, hsl(270 60% 50%), hsl(320 80% 55%))",
        color: "white",
        border: "none",
        fontWeight: 600,
        fontSize: "15px",
        boxShadow: "0 8px 30px rgba(168, 85, 247, 0.4)",
      },
      action: {
        label: "Обновить",
        onClick: () => {
          waitingWorker.postMessage({ type: "SKIP_WAITING" });
        },
      },
      actionButtonStyle: {
        background: "white",
        color: "hsl(270 60% 50%)",
        fontWeight: 700,
        borderRadius: "9999px",
        padding: "6px 16px",
      },
    });
  }, [waitingWorker]);

  return null;
};

export default SWUpdateNotifier;
