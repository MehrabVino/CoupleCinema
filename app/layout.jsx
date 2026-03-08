import "./globals.css";
import { AppSessionGate, AppSessionProvider } from "@/components/auth/AppSession";
import AppChrome from "@/components/layout/AppChrome";

export const metadata = {
  title: "Together Space",
  description: "Chat, meet, file sharing, and synced cinema in one minimal app."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppSessionProvider>
          <AppSessionGate>
            <AppChrome>{children}</AppChrome>
          </AppSessionGate>
        </AppSessionProvider>
      </body>
    </html>
  );
}
