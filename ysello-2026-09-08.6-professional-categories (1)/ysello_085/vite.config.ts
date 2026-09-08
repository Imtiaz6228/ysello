import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type HtmlTagDescriptor } from "vite";

const verificationVariables = [
  ["VITE_GOOGLE_SITE_VERIFICATION", "google-site-verification"],
  ["VITE_BING_SITE_VERIFICATION", "msvalidate.01"],
  ["VITE_YANDEX_SITE_VERIFICATION", "yandex-verification"],
  ["VITE_BAIDU_SITE_VERIFICATION", "baidu-site-verification"],
] as const;

const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

export default defineConfig(({ mode }) => {
  const environment = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  const verificationTags: HtmlTagDescriptor[] = verificationVariables
    .filter(([variable]) => Boolean(environment[variable]?.trim()))
    .map(([variable, name]) => ({
      tag: "meta",
      attrs: { name, content: environment[variable].trim() },
      injectTo: "head",
    }));
  const apiUrl = environment.VITE_API_BASE_URL?.trim();

  if (apiUrl) {
    try {
      const apiOrigin = new URL(apiUrl).origin;
      verificationTags.push(
        {
          tag: "link",
          attrs: { rel: "preconnect", href: apiOrigin, crossorigin: "" },
          injectTo: "head",
        },
        {
          tag: "link",
          attrs: { rel: "dns-prefetch", href: apiOrigin },
          injectTo: "head",
        },
      );
    } catch {
      // Environment validation reports malformed deployment URLs elsewhere.
    }
  }

  return {
    plugins: [
      react(),
      {
        name: "ysello-deployment-metadata",
        transformIndexHtml() {
          return verificationTags;
        },
      },
    ],
    server: {
      host: "0.0.0.0",
      allowedHosts: ["terminal.local"],
      port: 5173,
      ...(isCodexSeatbeltSandbox
        ? { watch: { useFsEvents: false, usePolling: true } }
        : {}),
      proxy: {
        "/api": "http://localhost:4000",
        "/uploads": "http://localhost:4000",
        "/google-callback.php": "http://localhost:4000",
      },
    },
    build: {
      outDir: "dist",
      sourcemap: false,
      cssCodeSplit: true,
      reportCompressedSize: true,
    },
  };
});
