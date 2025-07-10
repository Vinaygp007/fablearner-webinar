import type { Metadata } from "next";
import "./globals.css";



export const metadata: Metadata = {
  title: "FabLearner Webinar Masterclass",
  description: "Join the world's highest-rated online masterclass for parents. Help your child start reading before age 3!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <main style={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
