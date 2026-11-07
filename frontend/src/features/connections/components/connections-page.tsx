"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { ConnectionListSection } from "@/features/connections/components/connection-list-section";
import { useConnections } from "@/features/connections/providers/connections-provider";

type ConnectionTab = "incoming" | "outgoing" | "accepted";

const tabs: { id: ConnectionTab; label: string }[] = [
  { id: "incoming", label: "Incoming" },
  { id: "outgoing", label: "Sent" },
  { id: "accepted", label: "Connections" },
];

export function ConnectionsPage() {
  const { account } = useAuth();
  const connections = useConnections();
  const [activeTab, setActiveTab] = useState<ConnectionTab>("incoming");
  const list =
    activeTab === "incoming"
      ? connections.incoming
      : activeTab === "outgoing"
        ? connections.outgoing
        : connections.accepted;

  return (
    <section aria-labelledby="connections-heading" className="mx-auto max-w-5xl">
      <p className="text-sm font-medium text-moss">Your people</p>
      <h1
        className="mt-2 text-3xl font-medium tracking-[-0.055em] text-ink sm:text-4xl"
        id="connections-heading"
      >
        Connections
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
        Manage invitations and the people you have connected with.
      </p>

      <div
        aria-label="Connection lists"
        className="mt-7 flex flex-wrap gap-2"
        role="group"
      >
        {tabs.map((tab) => (
          <button
            aria-pressed={activeTab === tab.id}
            className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-moss ${
              activeTab === tab.id
                ? "border-ink bg-ink text-white"
                : "border-line bg-surface text-muted hover:bg-soft hover:text-ink"
            }`}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
            <span className="ml-2 opacity-75">
              {tab.id === "incoming"
                ? connections.incoming.length
                : tab.id === "outgoing"
                  ? connections.outgoing.length
                  : connections.accepted.length}
            </span>
          </button>
        ))}
      </div>

      {connections.isLoading ? (
        <div
          aria-label="Loading connections"
          className="mt-8 h-48 animate-pulse rounded-card border border-line bg-surface"
          role="status"
        >
          <span className="sr-only">Loading your connections…</span>
        </div>
      ) : connections.error ? (
        <div className="mt-8 rounded-card border border-line bg-surface p-6 sm:p-8">
          <p className="text-sm leading-6 text-[#8e3027]" role="alert">
            {connections.error}
          </p>
          <Button className="mt-4" onClick={connections.reload} type="button">
            Try again
          </Button>
        </div>
      ) : account ? (
        <div
          aria-live="polite"
          className="mt-8"
        >
          <ConnectionListSection
            connections={list}
            currentUserId={account.id}
            emptyDescription={
              activeTab === "incoming"
                ? "New connection requests will appear here."
                : activeTab === "outgoing"
                  ? "Requests you send will appear here."
                  : "When you accept or receive a request, your connections will appear here."
            }
            emptyTitle={
              activeTab === "incoming"
                ? "No incoming requests"
                : activeTab === "outgoing"
                  ? "No sent requests"
                  : "No connections yet"
            }
            title={
              activeTab === "incoming"
                ? "Incoming requests"
                : activeTab === "outgoing"
                  ? "Sent requests"
                  : "Accepted connections"
            }
          />
        </div>
      ) : null}
    </section>
  );
}
