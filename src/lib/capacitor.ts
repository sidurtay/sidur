// Capacitor native bridge — runs only inside the iOS/Android WebView
// Imported once in the root layout via a client component
export async function initCapacitor() {
  if (typeof window === "undefined") return;

  // Detect if running inside a Capacitor native shell
  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) return;

  const { StatusBar, Style } = await import("@capacitor/status-bar");
  const { SplashScreen } = await import("@capacitor/splash-screen");

  // Dark status bar to match the navy background
  await StatusBar.setStyle({ style: Style.Dark });
  await StatusBar.setBackgroundColor({ color: "#0F1117" });

  // Hide the splash after the app is ready
  await SplashScreen.hide({ fadeOutDuration: 300 });
}
