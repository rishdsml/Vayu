import type { GradientPalette } from "@/components/NoiseGradient";

/**
 * TEMPORARY: no authentication page exists yet. Every Sign Up button reads
 * this value. Point it at the real sign-in → onboarding flow when it exists.
 */
export const SIGNUP_URL = "/onboarding";

export const NAV_LINKS = [
  { label: "Agents", href: "#agents" },
  { label: "How it works", href: "#how-it-works" },
  { label: "FAQ", href: "#faq" },
] as const;

/**
 * Client logo strip: 15 brands in three sets of five (order = set order).
 * Sources and the relationship check are recorded in CLIENT_LOGOS.md at the project root.
 * All 15 appear on digitalmantra.in's own client wall; confirm current relationships
 * and logo-use approval with the DigitalMantra team before launch.
 *
 * `height` is the optical display height in px (wide wordmarks sit lower than stacked
 * marks so a set reads evenly); `w`/`h` are the file's intrinsic size; `raster` files
 * sit on white and are multiplied onto the page ground.
 */
export type ClientLogo = { name: string; src?: string; height?: number; w?: number; h?: number; raster?: boolean };
export const CLIENT_LOGOS: ClientLogo[] = [
  // Set 1
  { name: "Intel", src: "/clients/intel.svg", height: 30, w: 388, h: 151 },
  { name: "Godrej Properties", src: "/clients/godrej.png", height: 30, w: 153, h: 36, raster: true },
  { name: "BPL", src: "/clients/bpl.png", height: 36, w: 94, h: 66, raster: true },
  { name: "NIIT", src: "/clients/niit.png", height: 24, w: 127, h: 45, raster: true },
  { name: "Radisson Blu", src: "/clients/radisson.png", height: 32, w: 135, h: 43, raster: true },
  // Set 2
  { name: "Philips", src: "/clients/philips.svg", height: 24, w: 800, h: 160 },
  { name: "Shapoorji Pallonji", src: "/clients/shapoorji.png", height: 40, w: 140, h: 70, raster: true },
  { name: "USHA", src: "/clients/usha.png", height: 28, w: 131, h: 46, raster: true },
  { name: "Fortis", src: "/clients/fortis.png", height: 28, w: 131, h: 50, raster: true },
  { name: "India TV", src: "/clients/indiatv.png", height: 44, w: 96, h: 96, raster: true },
  // Set 3
  { name: "Fujifilm", src: "/clients/fujifilm.svg", height: 20, w: 1029, h: 171 },
  { name: "Future Group", src: "/clients/future.png", height: 32, w: 168, h: 54, raster: true },
  { name: "Banaras Hindu University", src: "/clients/bhu.png", height: 36, w: 132, h: 56, raster: true },
  { name: "AIPL", src: "/clients/aipl.png", height: 34, w: 135, h: 60, raster: true },
  { name: "The 3C Company", src: "/clients/threec.png", height: 34, w: 144, h: 63, raster: true },
];

/** Footer: only verified DigitalMantra destinations (from the original site). */
export const COMPANY_LINKS = [
  { label: "About DigitalMantra", href: "https://digitalmantra.in/about-us/" },
  { label: "Contact", href: "https://digitalmantra.in/contact-us/" },
] as const;
export const LEGAL_LINKS = [{ label: "Privacy Policy", href: "https://digitalmantra.in/privacy-policy/" }] as const;
/** TEMPORARY: no Terms of Service page is verified yet. Add it here when it exists. */
export const TERMS_URL: string | null = null;

/**
 * Hero gradient (DESIGN_RULES.md §1, §6). Values mirror the CSS tokens:
 * pastel ramp → indigo depth → gold veins, calm under the headline.
 */
export const HERO_GRADIENT: GradientPalette = {
  // Cool neutral → steel blue ramp; no lavender stop, and the warm stop is a muted
  // gold-cream so gold reads as highlights rather than yellow clouds.
  pastels: ["#C9D2DD", "#AFBDD0", "#DCE1E7", "#E3E1D8"], // steel light, steel blue, cool neutral, neutral stone (gold comes from the veins)
  deep: "#2E3277", // indigo, slightly deeper so it grounds without going violet
  accent: "#C9A23A", // gold
  calm: "#ECEEF1", // cool neutral behind the type
};

/**
 * Contained cards (CTA, agents panel): same palette, tuned for a smaller frame:
 * tighter structure, more indigo at the edges, gold kept to thin highlights.
 */
export const CARD_GRADIENT = {
  palette: HERO_GRADIENT,
  scale: 1.6,
  distortion: 0.65,
  deepAmount: 1,
  accentAmount: 0.3,
} as const;
