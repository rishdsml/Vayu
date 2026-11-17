import type { Metadata } from "next";
import { Onboarding } from "@/components/onboarding/Onboarding";

export const metadata: Metadata = {
  title: "Get started · The Intelligence Layer for Google Ads",
  description: "Sign in with Google, choose your Google Ads account and get your account ready for analysis.",
};

export default function OnboardingPage() {
  return <Onboarding />;
}
