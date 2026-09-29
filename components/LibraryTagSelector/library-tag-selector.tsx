"use client"

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { setLibraryTag } from "@/features/library/set-library-tags";
import {
  LIBRARY_TAGS,
  LIBRARY_TAG_LABELS,
  type LibraryTag,
} from "@/features/library/library-tags";

interface LibrarytagSelectorProps { 
    workId: string;
    isLoggedIn: boolean;
    initialTag: LibraryTag | null;
}

export function LibraryTagSelector({workId, isLoggedIn, initialTag}: LibrarytagSelectorProps){
    const [tag, setTag] = useState(initialTag);
    const [isPending, setIsPending] = useState(false);

    const handleClick = async (clicked: LibraryTag) => {
        if (isPending) return;
        const previous = tag;
        const next = tag === clicked ? null : clicked;
        setTag(next);
        setIsPending(true);

        const result = await setLibraryTag(workId, next);

        setIsPending(false);
        if (result.error) setTag(previous);
  };

  if (!isLoggedIn) {
    return (
      <p className="text-sm text-muted-foreground">
        <Link href="/auth/login" className="underline">
          Inicia sesión
        </Link>{" "}
        para guardar esta obra en tu biblioteca.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {LIBRARY_TAGS.map((t) => (
        <button
          key={t}
          type="button"
          disabled={isPending}
          onClick={() => handleClick(t)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60",
            tag === t
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:bg-accent",
          )}
        >
          {LIBRARY_TAG_LABELS[t]}
        </button>
      ))}
    </div>
  );
}