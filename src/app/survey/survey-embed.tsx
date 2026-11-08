"use client";

import { useEffect, useRef, useState } from "react";
import { CommunityInvite } from "@/components/community-invite";
import { ContributionThanks } from "@/components/contribution-thanks";
import { track } from "@/lib/analytics";

const EMBED_URL = "https://tally.so/embed/RWKrVl?alignLeft=1&hideTitle=0&transparentBackground=1&dynamicHeight=0";

/**
 * The Tally questionnaire, unchanged. Tally's embed posts events to the page,
 * which lets us count starts and completions and show HARF's thank-you.
 */
export function SurveyEmbed() {
  const [done, setDone] = useState(false);
  const seen = useRef({ view: false, start: false });

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== "https://tally.so" || typeof e.data !== "string" || !e.data.includes("Tally.")) return;
      let message: { event?: string; payload?: { page?: number } };
      try {
        message = JSON.parse(e.data);
      } catch {
        return;
      }
      if (message.event === "Tally.FormLoaded" && !seen.current.view) {
        seen.current.view = true;
        track("survey_view");
      }
      // Page 1 is the introduction; reaching page 2 means the person started answering.
      if (message.event === "Tally.FormPageView" && (message.payload?.page ?? 0) >= 2 && !seen.current.start) {
        seen.current.start = true;
        track("survey_start");
      }
      if (message.event === "Tally.FormSubmitted") {
        track("survey_submit");
        setDone(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (done) {
    return (
      <div className="mx-auto max-w-3xl">
        <ContributionThanks source="survey" />
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg bg-card shadow-sm ring-1 ring-rule">
        <iframe src={EMBED_URL} title="HARF survey" className="h-[760px] w-full" />
      </div>
      <CommunityInvite />
    </>
  );
}
