import type { Metadata } from "next";
import { DashFilm } from "@/components/film/DashFilm";

export const metadata: Metadata = { title: "Dashboard film · DigitalMantra", robots: { index: false } };

export default function DashFilmPage() {
  return <DashFilm />;
}
