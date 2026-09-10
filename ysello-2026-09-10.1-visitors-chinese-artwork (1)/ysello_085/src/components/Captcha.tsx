import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
        },
      ) => string;
      remove: (id: string) => void;
    };
  }
}

const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

export function Captcha({ onVerify }: { onVerify: (token: string) => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetRef = useRef<string | null>(null);

  useEffect(() => {
    if (!siteKey || !containerRef.current) {
      return;
    }

    if (!document.querySelector("#turnstile-script")) {
      const script = document.createElement("script");
      script.id = "turnstile-script";
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const interval = window.setInterval(() => {
      if (window.turnstile && containerRef.current && !widgetRef.current) {
        widgetRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: onVerify,
          "expired-callback": () => onVerify(""),
        });
        window.clearInterval(interval);
      }
    }, 150);

    return () => {
      window.clearInterval(interval);
      if (window.turnstile && widgetRef.current) {
        window.turnstile.remove(widgetRef.current);
        widgetRef.current = null;
      }
    };
  }, [onVerify]);

  if (!siteKey) {
    return null;
  }

  return <div className="captcha-slot" ref={containerRef} />;
}
