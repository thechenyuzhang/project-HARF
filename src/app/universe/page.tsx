import type { Metadata } from "next";
import { UniverseSky } from "./universe-sky";

export const metadata: Metadata = {
  title: "The AI Universe",
  description: "Every story is a point of light. Explore the constellations of ideas people share about living with AI.",
};

export default function UniversePage() {
  return <UniverseSky />;
}
