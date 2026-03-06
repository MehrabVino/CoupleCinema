import "./globals.css";
import { AppSessionGate, AppSessionProvider } from "@/components/auth/AppSession";

export const metadata = {
  title: "CoupleCinema Platform",
  description: "Chat, meet, file sharing, and synced cinema in one minimal app."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppSessionProvider>
          <AppSessionGate>{children}</AppSessionGate>
        </AppSessionProvider>
      </body>
    </html>
  );
}
