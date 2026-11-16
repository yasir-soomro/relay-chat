"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { ConnectionListSection } from "@/features/connections/components/connection-list-section";
import { useConnections } from "@/features/connections/providers/connections-provider";

type ConnectionTab = "incoming" | "outgoing" | "accepted";

const tabs: { id: ConnectionTab; label: string }[] = [
  { id: "incoming", label: "Incoming" },
  { id: "outgoing", label: "Outgoing" },
  { id: "accepted", label: "Connections" },
];

const tabCopy: Record<
  ConnectionTab,
  {
    eyebrow: string;
    heading: string;
    description: string;
    listTitle: string;
    countLabel: string;
    emptyTitle: string;
    emptyDescription: string;
  }
> = {
  incoming: {
    eyebrow: "Your circle starts here",
    heading: "Connection requests",
    description:
      "A familiar face or someone new. You decide who gets to say hello.",
    listTitle: "Waiting for you",
    countLabel: "request",
    emptyTitle: "No incoming requests",
    emptyDescription:
      "When someone sends a connection request, you can review it here.",
  },
  outgoing: {
    eyebrow: "Your circle starts here",
    heading: "Requests you’ve sent",
    description: "Keep track of the people you have reached out to.",
    listTitle: "Awaiting a reply",
    countLabel: "request",
    emptyTitle: "No sent requests",
    emptyDescription: "Requests you send will appear here.",
  },
  accepted: {
    eyebrow: "Your people",
    heading: "Your connections",
    description:
      "Your mutual connections are ready for a private, one-to-one conversation.",
    listTitle: "Connected",
    countLabel: "connection",
    emptyTitle: "No connections yet",
    emptyDescription:
      "When a request is accepted, that person will appear here.",
  },
};

function ConnectionLoadingState({ title }: { title: string }) {
  return (
    <div
      aria-label={`Loading ${title.toLowerCase()}`}
      className="mt-5 grid gap-3"
      role="status"
    >
      <span className="sr-only">Loading {title.toLowerCase()}…</span>
      {Array.from({ length: 3 }, (_, index) => (
        <div
          aria-hidden="true"
          className="h-24 animate-pulse rounded-xl border border-line bg-surface motion-reduce:animate-none"
          key={index}
        />
      ))}
    </div>
  );
}

function ConnectionSteps() {
  const steps = [
    { title: "01 Discover", description: "Find someone you’d like to know." },
    { title: "02 Connect", description: "Send or accept a request." },
    { title: "03 Say hello", description: "Message privately, one to one." },
  ];

  return (
    <ol
      aria-label="How Relay connections work"
      className="connections-steps mt-8 grid gap-2 rounded-2xl bg-soft p-4 sm:grid-cols-3 sm:gap-4 sm:p-5"
    >
      {steps.map((step) => (
        <li className="min-w-0 px-1 py-1" key={step.title}>
          <p className="text-xs font-semibold tracking-wide text-primary">
            {step.title}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">
            {step.description}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function ConnectionsPage() {
  const { account } = useAuth();
  const connections = useConnections();
  const [activeTab, setActiveTab] = useState<ConnectionTab>("incoming");
  const tabRefs = useRef<Record<ConnectionTab, HTMLButtonElement | null>>({
    incoming: null,
    outgoing: null,
    accepted: null,
  });
  const list =
    activeTab === "incoming"
      ? connections.incoming
      : activeTab === "outgoing"
        ? connections.outgoing
        : connections.accepted;
  const copy = tabCopy[activeTab];

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
    let nextIndex = currentIndex;

    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextTab = tabs[nextIndex].id;
    setActiveTab(nextTab);
    tabRefs.current[nextTab]?.focus();
  }

  function countFor(tab: ConnectionTab) {
    return tab === "incoming"
      ? connections.incoming.length
      : tab === "outgoing"
        ? connections.outgoing.length
        : connections.accepted.length;
  }

  return (
    <section
      aria-labelledby="connections-heading"
      className="connections-page mx-auto w-full max-w-5xl"
    >
      <header className="connections-header">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-primary">
          {copy.eyebrow}
        </p>
        <h1
          className="mt-2 text-3xl font-semibold leading-tight tracking-[-0.045em] text-ink sm:text-4xl"
          id="connections-heading"
        >
          {copy.heading}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted sm:text-base">
          {copy.description}
        </p>
      </header>

      <div
        aria-label="Connection lists"
        className="connections-tabs mt-6 flex w-full border-b border-line"
        role="tablist"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              aria-controls="connections-panel"
              aria-selected={isActive}
              className={`connections-tab relative inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-3 text-xs font-semibold transition-colors focus-visible:outline-focus sm:flex-none sm:gap-2 sm:px-4 sm:text-sm ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:text-ink"
              }`}
              id={`${tab.id}-tab`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={handleTabKeyDown}
              ref={(element) => {
                tabRefs.current[tab.id] = element;
              }}
              role="tab"
              tabIndex={isActive ? 0 : -1}
              type="button"
            >
              <span className="truncate">{tab.label}</span>
              {connections.isLoading ? (
                <span
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 animate-pulse rounded-full bg-soft motion-reduce:animate-none"
                />
              ) : (
                <span
                  className={`min-w-4 rounded-full px-1 py-0.5 text-[0.65rem] leading-none ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "bg-soft text-muted"
                  }`}
                >
                  {countFor(tab.id)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div
        aria-labelledby={`${activeTab}-tab`}
        className="mt-5 min-w-0"
        id="connections-panel"
        role="tabpanel"
        tabIndex={0}
      >
        {connections.isLoading ? (
          <ConnectionLoadingState title={copy.listTitle} />
        ) : connections.error ? (
          <div className="rounded-xl border border-line bg-surface p-5 sm:p-7">
            <p className="text-sm leading-6 text-danger" role="alert">
              {connections.error}
            </p>
            <Button className="mt-4" onClick={connections.reload} type="button">
              Try again
            </Button>
          </div>
        ) : account ? (
          <div aria-live="polite">
            <ConnectionListSection
              allowCancelRequest={activeTab === "outgoing"}
              connections={list}
              currentUserId={account.id}
              countLabel={copy.countLabel}
              emptyDescription={copy.emptyDescription}
              emptyTitle={copy.emptyTitle}
              title={copy.listTitle}
            />
          </div>
        ) : null}
      </div>

      <ConnectionSteps />
    </section>
  );
}
