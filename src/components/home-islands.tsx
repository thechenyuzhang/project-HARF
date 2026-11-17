"use client";

import { MessageCircleQuestionMark } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchCurrentWeeklyQuestion, type WeeklyQuestion } from "@/lib/amplify";
import { CircleLink } from "./circle-link";

export function WeeklyQuestionCard() {
  const [question, setQuestion] = useState<WeeklyQuestion | null | undefined>(undefined);

  useEffect(() => {
    fetchCurrentWeeklyQuestion()
      .then(setQuestion)
      .catch(() => setQuestion(null));
  }, []);

  if (question === null) return null;
  const href = question ? `/share/?weekly=${question.id}` : "/share/";

  return (
    <section className="mx-auto max-w-6xl px-5 pt-16">
      <div className="grid items-center gap-6 rounded-lg bg-navy p-8 text-card sm:p-12 md:grid-cols-[auto_1fr_auto] md:gap-8">
        <span className="flex size-16 items-center justify-center rounded-full bg-card/10 text-card">
          <MessageCircleQuestionMark aria-hidden className="size-8" strokeWidth={1.5} />
        </span>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-card/60">
            Question of the week
            {question?.weekOf
              ? ` · ${new Date(`${question.weekOf}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric" })}`
              : ""}
          </p>
          {question === undefined ? (
            <div className="mt-3 h-10 max-w-xl animate-pulse rounded bg-card/10" />
          ) : (
            <Link href={href} data-track="qotw_click" data-track-from="home_question" className="hover:underline">
              <h2 className="mt-2 font-serif text-2xl leading-snug sm:text-3xl">{question.question}</h2>
            </Link>
          )}
        </div>
        {question ? (
          <span data-track="qotw_click" data-track-from="home_button">
            <CircleLink href={href} tone="light">
              Respond
            </CircleLink>
          </span>
        ) : null}
      </div>
    </section>
  );
}
