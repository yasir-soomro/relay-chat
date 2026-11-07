"use client";

import { useEffect, useState } from "react";
import { formControlClassName } from "@/components/ui/form-control";

type UsernameSearchProps = {
  onSearch: (query: string) => void;
  debounceMs?: number;
};

export function UsernameSearch({
  onSearch,
  debounceMs = 300,
}: UsernameSearchProps) {
  const [value, setValue] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      onSearch(value.trim());
    }, debounceMs);
    return () => window.clearTimeout(timeout);
  }, [debounceMs, onSearch, value]);

  return (
    <div className="w-full max-w-xl">
      <label
        className="mb-2 block text-sm font-semibold text-ink"
        htmlFor="username-search"
      >
        Search by username
      </label>
      <input
        autoComplete="off"
        className={formControlClassName}
        id="username-search"
        maxLength={30}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Start typing a username"
        type="search"
        value={value}
      />
      <p className="mt-2 text-xs leading-5 text-muted">
        Search matches usernames beginning with your query.
      </p>
    </div>
  );
}
