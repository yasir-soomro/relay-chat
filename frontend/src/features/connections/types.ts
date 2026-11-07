import type { UserProfile } from "@/features/users/types";

export type ConnectionStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "removed";

export type ConnectionRecord = {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: ConnectionStatus;
  requested_at: string;
  responded_at: string | null;
  rejected_at: string | null;
  removed_at: string | null;
};

export type ConnectionPage = {
  items: ConnectionRecord[];
};

export type BlockResponse = {
  blocked_user_id: string;
  created_at: string;
};

export type ConnectionViewState =
  | { status: "none" }
  | { status: "blocked" }
  | { status: "rejected" }
  | { status: "pending"; direction: "incoming" | "outgoing"; connectionId: string }
  | { status: "accepted"; connectionId: string };

export type ConnectionListEntry = {
  connection: ConnectionRecord;
  userId: string;
  profile: UserProfile | null;
  profileError: string;
};
