import type { Metadata } from "next";
import { Launch } from "@/components/launch/Launch";

export const metadata: Metadata = {
  title: "Dashboard launch film · DigitalMantra",
  robots: { index: false },
};

export default function LaunchPage() {
  return <Launch />;
}
