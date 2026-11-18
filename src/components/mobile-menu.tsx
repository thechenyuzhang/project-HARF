"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/share/", label: "Share your story" },
  { href: "/archive/", label: "Living Archive" },
  { href: "/survey/", label: "Survey" },
  { href: "/about/", label: "About" },
  { href: "/privacy/", label: "Privacy" },
];

export function MobileMenu() {
  const [openOn, setOpenOn] = useState<string | null>(null);
  const pathname = usePathname();
  // Closes automatically on navigation: the menu is only open for the page it was opened on.
  const open = openOn === pathname;

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpenOn(open ? null : pathname)}
        className="flex size-10 items-center justify-center rounded-full hover:bg-paper-deep"
      >
        {open ? <X className="size-6" /> : <Menu className="size-6" />}
      </button>
      {open ? (
        <nav aria-label="Mobile" className="absolute inset-x-0 top-full border-b border-rule bg-paper px-5 pb-6 pt-2 shadow-lg">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="block border-b border-rule py-4 font-serif text-2xl last:border-0">
              {l.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
