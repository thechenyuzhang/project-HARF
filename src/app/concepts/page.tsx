import type { Metadata } from "next";
import { ConceptsLab } from "./concepts-lab";

// An internal review page: landing-page directions to choose between.
export const metadata: Metadata = {
  title: "Landing concepts",
  description: "Constellation directions and title wordings for the HARF landing page.",
  robots: { index: false },
};

export default function ConceptsPage() {
  return <ConceptsLab />;
}
