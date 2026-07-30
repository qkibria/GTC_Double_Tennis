import "./globals.css";
import { AuthProvider } from "./components/AuthProvider";
import TopBar from "./components/TopBar";
import BottomNav from "./components/BottomNav";

export const metadata = {
  title: "Greenford Tennis Club (GTC) Doubles Tennis",
  description: "Match generator, results, and stats for Greenford Tennis Club doubles sessions",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <TopBar />
          <main style={{ paddingBottom: 70 }}>{children}</main>
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
