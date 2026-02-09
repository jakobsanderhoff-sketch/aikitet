"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";

export function WaitlistCount() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/waitlist")
      .then((res) => res.json())
      .then((data) => setCount(data.count))
      .catch(() => {});
  }, []);

  if (count === null || count === 0) return null;

  return (
    <div className="inline-flex items-center gap-2 text-sm text-zinc-400">
      <Users className="h-4 w-4" />
      <span>
        Join{" "}
        <span className="text-white font-medium">
          {count.toLocaleString()}
        </span>{" "}
        architects on the waitlist
      </span>
    </div>
  );
}
