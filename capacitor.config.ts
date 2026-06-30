import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.sidur.il",
  appName: "Sidur",
  // Points to the live Vercel deployment — no static build needed
  // because the app has server-side API routes
  server: {
    url: "https://sidurr.vercel.app",
    cleartext: false,
  },
  ios: {
    contentInset: "always",
    backgroundColor: "#0F1117",
  },
  android: {
    backgroundColor: "#0F1117",
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#0F1117",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
