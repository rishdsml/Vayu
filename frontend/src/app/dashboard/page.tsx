import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard/Dashboard";

export const metadata: Metadata = {
  title: "SMS Lucknow · Dashboard · DigitalMantra",
  description: "Findings, lever status and performance for a connected Google Ads account.",
  robots: { index: false },
};

export default function DashboardPage() {
  return <Dashboard />;
}
