import { Timestamp } from "firebase/firestore";

export interface Participant {
  id: string; // Document ID (UUID)
  name: string;
  teamId: string; // Reference to Team document ID
}

export interface Team {
  id: string; // Document ID
  name: string;
  ticketCount: number;
  initialTicketCount: number;
  members: string[]; // List of participant names or UUIDs
}

export type SupportTicketStatus =
  | "waiting_assignment"
  | "queued"
  | "called"
  | "in_progress" // Added for clarity during support
  | "completed"
  | "cancelled";

export interface SupportTicket {
  id: string; // Document ID
  teamId: string; // Reference to Team document ID
  teamName: string; // Denormalized
  participantUUID: string; // Reference to Participant document ID
  participantName: string; // Denormalized
  topic: string;
  status: SupportTicketStatus;
  requestTimestamp: Timestamp;
  assignedTerminalId: string | null; // Reference to Terminal document ID
  assignedTerminalName: string | null; // Denormalized
  calledTimestamp: Timestamp | null;
  startedTimestamp: Timestamp | null; // When staff starts support
  completedTimestamp: Timestamp | null;
  supportTimeLimit: number | null; // Optional: in seconds
}

export interface Terminal {
  id: string; // Document ID
  name: string;
  isOpen: boolean;
  assignedStaffId: string | null; // Optional: Reference to Staff document ID
  currentTicketId: string | null; // Reference to SupportTicket document ID
  queueOrder: string[]; // Ordered list of SupportTicket document IDs
}

// Optional: If staff need specific accounts/permissions
export interface Staff {
  id: string; // Document ID (likely Firebase Auth UID)
  name: string;
  assignedTerminalId: string | null; // Reference to Terminal document ID
}