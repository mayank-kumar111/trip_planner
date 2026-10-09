import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "./ConvexClientProvider";

const outfit = Outfit({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Trip Planner — AI-Powered Travel Planning",
    template: "%s | Trip Planner",
  },
  description:
    "Plan personalized trips with AI-powered itineraries, hotels, places, budgets, and travel recommendations.",
  applicationName: "Trip Planner",
  keywords: [
    "AI trip planner",
    "travel planner",
    "trip itinerary",
    "travel itinerary",
    "AI travel planning",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={outfit.className}>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
