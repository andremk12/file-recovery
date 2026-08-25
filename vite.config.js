import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

function createCspPlugin(policy) {
  return {
    name: "inject-content-security-policy",

    transformIndexHtml() {
      return [
        {
          tag: "meta",
          attrs: {
            "http-equiv": "Content-Security-Policy",
            content: policy,
          },
          injectTo: "head-prepend",
        },
      ];
    },
  };
}

export default defineConfig(({ command }) => {
  const isProduction = command === "build";

  const developmentPolicy = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' ws://localhost:5173",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");

  const productionPolicy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");

  const policy = isProduction
    ? productionPolicy
    : developmentPolicy;

  return {
    base: "./",

    plugins: [
      react(),
      createCspPlugin(policy),
    ],

    server: {
      port: 5173,
      strictPort: true,
    },
  };
});