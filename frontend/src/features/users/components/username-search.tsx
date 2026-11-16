"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { RelayIcon } from "@/components/ui/relay-icon";

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
    <div className="w-full">
      <label
        className="sr-only"
        htmlFor="username-search"
      >
        Search by username
      </label>
      <div className="discovery-search-shell relative flex min-h-12 w-full min-w-0 items-center rounded-xl border border-line bg-surface px-3 shadow-sm transition-[border-color,box-shadow] duration-150">
        <RelayIcon
          className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted"
          name="discover"
        />
        <Input
          aria-describedby="username-search-help"
          autoComplete="off"
          className="discovery-search-input min-h-10 min-w-0 flex-1 rounded-lg border-0 bg-transparent py-2 pl-10 pr-2 text-sm shadow-none outline-none ring-0 placeholder:text-muted/70 hover:border-transparent focus:border-transparent focus:outline-none focus:ring-0 focus-visible:outline-none"
          id="username-search"
          maxLength={30}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Search by username"
          type="search"
          value={value}
        />
        {value ? (
          <button
            aria-label="Clear username search"
            className="discovery-search-clear inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg px-2.5 text-xs font-semibold text-muted transition-[background-color,color,transform] duration-150 hover:bg-soft hover:text-ink active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
            onClick={(event) => {
              setValue("");
              event.currentTarget.parentElement
                ?.querySelector<HTMLInputElement>("input")
                ?.focus();
            }}
            type="button"
          >
            Clear
          </button>
        ) : null}
      </div>
      <p className="sr-only" id="username-search-help">
        Search matches usernames beginning with your query.
      </p>
    </div>
  );
}
