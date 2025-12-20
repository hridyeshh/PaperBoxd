import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "in.paperboxd",
  appName: "PaperBoxd",
  webDir: "out",
  server: {
    // Use the Capacitor scheme on iOS so the app can load
    // the static assets from the bundled webview.
    iosScheme: "capacitor",
  },
  ios: {
    // Ensure content respects the notch / Dynamic Island safe areas
    contentInset: "always",
  },
};

export default config;
