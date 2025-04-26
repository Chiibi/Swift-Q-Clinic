"use client";

import React, { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase/config";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  writeBatch,
  addDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  getDoc,
  increment,
} from "firebase/firestore";
import { Terminal, SupportTicket, SupportTicketStatus, Team, Participant } from "@/lib/firebase/types"; // Re-added Team, Participant
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useDroppable,
  UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import EditTicketModal from "@/components/EditTicketModal"; // Import the modal

// --- Constants ---
const WAITING_LIST_ID = "waiting_assignment";

// --- Draggable Ticket Component ---
interface SortableTicketProps {
  ticket: SupportTicket;
  isOverlay?: boolean;
  onEdit: (ticket: SupportTicket) => void;
  onDelete: (ticketId: string, teamName: string, topic: string) => void;
}
function SortableTicket({ ticket, isOverlay, onEdit, onDelete }: SortableTicketProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ticket.id, disabled: isOverlay }); // Disable sorting when in overlay
  const style = { transform: CSS.Transform.toString(transform), transition: isOverlay ? undefined : transition, opacity: isDragging && !isOverlay ? 0.5 : 1, zIndex: isOverlay ? 999 : isDragging ? 10 : 'auto', cursor: isOverlay ? 'grabbing' : 'grab' };
  // Removed getBackgroundColor function, applying consistent style
  return (
    // Apple-like card style: subtle background, rounded corners, border
    <div ref={setNodeRef} style={style} className={`p-3 rounded-lg border border-neutral-200 bg-neutral-50 shadow-sm mb-2 relative group ${isOverlay ? 'shadow-xl scale-105' : ''}`}>
       {/* Subtle Drag Handle */}
       <div {...attributes} {...listeners} className="absolute top-1.5 right-1.5 cursor-grab p-1 text-neutral-400 opacity-0 group-hover:opacity-60 transition-opacity">⠿</div>

      {/* Adjusted text colors for better contrast */}
      <p className="font-medium text-sm text-neutral-900">{ticket.teamName}{ticket.status === 'called' ? ' (Called)' : ticket.status === 'in_progress' ? ' (In Progress)' : ''}</p>
      <p className="text-xs text-neutral-600 mt-0.5">{ticket.topic}</p>
      <p className="text-xs text-neutral-500 mt-1">Req: {ticket.requestTimestamp?.toDate().toLocaleTimeString()}</p>
       {/* Edit/Delete Buttons - Apple-like subtle buttons */}
       {!isOverlay && (
        <div className="absolute bottom-1.5 right-1.5 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
                onClick={(e) => { e.stopPropagation(); onEdit(ticket); }}
                className="text-xs bg-neutral-200 hover:bg-neutral-300 text-neutral-700 p-1.5 rounded-md leading-none"
                aria-label={`Edit ticket for ${ticket.teamName}`}
            >
                ✏️
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); onDelete(ticket.id, ticket.teamName, ticket.topic); }}
                className="text-xs bg-red-100 hover:bg-red-200 text-red-700 p-1.5 rounded-md leading-none"
                aria-label={`Delete ticket for ${ticket.teamName}`}
            >
                🗑️
            </button>
        </div>
       )}
    </div>
  );
}

// --- Droppable Container Component ---
interface DroppableContainerProps {
  id: UniqueIdentifier;
  title: string;
  items: SupportTicket[];
  isOpen?: boolean;
  itemCount: number;
  terminalData?: Terminal;
  onCallNext?: (terminalId: string) => void;
  onStartSupport?: (terminalId: string, ticketId: string) => void;
  onEndSupport?: (terminalId: string, ticketId: string) => void;
  // Add Edit/Delete handlers
  onEdit: (ticket: SupportTicket) => void;
  onDelete: (ticketId: string, teamName: string, topic: string) => void;
}
function DroppableContainer({ id, title, items, isOpen = true, itemCount, terminalData, onCallNext, onStartSupport, onEndSupport, onEdit, onDelete }: DroppableContainerProps) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { type: 'container', accepts: ['ticket'] } });
  const sortableItemIds = useMemo(() => items.filter(t => t.id !== terminalData?.currentTicketId).map(t => t.id), [items, terminalData?.currentTicketId]);
  // Apply Apple-like styling: semi-transparent background, blur, rounded corners, subtle border
  const containerStyle = `p-4 rounded-xl shadow-sm border min-h-[300px] flex flex-col ${isOpen ? "bg-white/60 backdrop-blur-lg border-neutral-200" : "bg-neutral-300/50 border-neutral-400"} ${isOver ? 'outline outline-2 outline-offset-2 outline-blue-500' : ''}`;
  const titleStyle = `text-lg font-medium mb-3 text-center border-b border-neutral-200 pb-2 ${isOpen ? "text-neutral-900" : "text-neutral-600"}`;
  const currentTicket = terminalData?.currentTicketId ? items.find(t => t.id === terminalData.currentTicketId) : null;
  const canCallNext = isOpen && terminalData && !terminalData.currentTicketId && terminalData.queueOrder.length > 0;
  const canStartSupport = isOpen && currentTicket && currentTicket.status === 'called';
  const canEndSupport = isOpen && currentTicket && currentTicket.status === 'in_progress';

  return (
    <div ref={setNodeRef} className={containerStyle}>
      <h2 className={titleStyle}>{title} ({itemCount})</h2>
      {id !== WAITING_LIST_ID && terminalData && (
        <div className="flex justify-center flex-wrap gap-2 my-3"> {/* Increased margin */}
          {/* Apple-style buttons */}
          <button onClick={() => onCallNext?.(terminalData.id)} disabled={!canCallNext} className="text-xs bg-green-600 hover:bg-green-700 text-white font-medium py-1.5 px-3 rounded-md disabled:opacity-60 disabled:cursor-not-allowed">Call Next</button>
          <button onClick={() => onStartSupport?.(terminalData.id, currentTicket!.id)} disabled={!canStartSupport} className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium py-1.5 px-3 rounded-md disabled:opacity-60 disabled:cursor-not-allowed">Start Support</button>
          <button onClick={() => onEndSupport?.(terminalData.id, currentTicket!.id)} disabled={!canEndSupport} className="text-xs bg-red-600 hover:bg-red-700 text-white font-medium py-1.5 px-3 rounded-md disabled:opacity-60 disabled:cursor-not-allowed">End Support</button>
        </div>
      )}
       {currentTicket && (currentTicket.status === 'called' || currentTicket.status === 'in_progress') && (
         // Styled "Now Serving" block
         <div className="mb-3 p-2.5 rounded-lg bg-green-100 border border-green-300 text-center">
           <p className="text-xs uppercase tracking-wider font-medium text-green-800">Now Serving</p>
           <p className="text-sm font-semibold text-green-900 mt-0.5">{currentTicket.teamName}</p>
           <p className="text-xs text-green-700">{currentTicket.status === 'in_progress' ? '(In Progress)' : '(Called)'}</p>
         </div>
       )}
      <SortableContext items={sortableItemIds} strategy={verticalListSortingStrategy}>
        <div className="flex-grow space-y-2 pt-1"> {/* Added padding top */}
          {items.filter(ticket => ticket.id !== terminalData?.currentTicketId).map((ticket) => (
            <SortableTicket
                key={ticket.id}
                ticket={ticket}
                onEdit={onEdit} // Pass down the handler
                onDelete={onDelete} // Pass down the handler
            />
          ))}
          {items.filter(ticket => ticket.id !== terminalData?.currentTicketId).length === 0 && isOpen && !currentTicket && (<p className="text-neutral-500 text-center pt-6 text-sm">Drop tickets here or queue is empty.</p>)}
          {items.filter(ticket => ticket.id !== terminalData?.currentTicketId).length === 0 && isOpen && currentTicket && (<p className="text-neutral-500 text-center pt-6 text-sm">Queue is empty.</p>)}
          {!isOpen && (<p className="text-neutral-600 text-center pt-6 font-medium">Terminal Closed</p>)}
        </div>
      </SortableContext>
    </div>
  );
}

// --- Terminal Management Component ---
interface TerminalManagerProps {
    terminals: Terminal[];
    onAdd: (name: string) => Promise<void>;
    onUpdate: (id: string, updates: Partial<Terminal>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}
function TerminalManager({ terminals, onAdd, onUpdate, onDelete }: TerminalManagerProps) {
    const [newTerminalName, setNewTerminalName] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [editingTerminalId, setEditingTerminalId] = useState<string | null>(null);
    const [editingTerminalName, setEditingTerminalName] = useState("");
    async function handleAddSubmit(e: React.FormEvent) { e.preventDefault(); if (!newTerminalName.trim() || isAdding) return; setIsAdding(true); try { await onAdd(newTerminalName.trim()); setNewTerminalName(""); } catch (error) { console.error("Failed to add terminal:", error); alert("Failed to add terminal."); } finally { setIsAdding(false); } }
    async function handleDeleteClick(id: string, name: string) { if (window.confirm(`Are you sure you want to delete terminal "${name}"? This cannot be undone.`)) { try { await onDelete(id); } catch (error) { console.error("Failed to delete terminal:", error); alert("Failed to delete terminal."); } } }
    async function handleToggleOpen(terminal: Terminal) { try { await onUpdate(terminal.id, { isOpen: !terminal.isOpen }); } catch (error) { console.error("Failed to toggle terminal status:", error); alert("Failed to toggle terminal status."); } }
    function handleEditClick(terminal: Terminal) { setEditingTerminalId(terminal.id); setEditingTerminalName(terminal.name); }
    async function handleEditSave(id: string) { if (!editingTerminalName.trim()) return; try { await onUpdate(id, { name: editingTerminalName.trim() }); setEditingTerminalId(null); } catch (error) { console.error("Failed to update terminal name:", error); alert("Failed to update terminal name."); } }
    function handleEditCancel() { setEditingTerminalId(null); setEditingTerminalName(""); }

    return (
        <div className="mb-8 p-6 bg-white/70 backdrop-blur-md rounded-xl shadow-sm border border-neutral-200 w-full max-w-4xl">
            {/* Apply Apple-like styling: semi-transparent background, blur, rounded corners, subtle border */}
            <h2 className="text-xl font-medium mb-5 text-center">Manage Terminals</h2> {/* Increased margin */}
            <form onSubmit={handleAddSubmit} className="flex gap-3 mb-5 items-end"> {/* Increased gap and margin */}
                <div className="flex-grow">
                    <label htmlFor="terminalName" className="block text-sm font-medium text-neutral-700 mb-1">New Terminal Name</label> {/* Adjusted label color */}
                    <input type="text" id="terminalName" value={newTerminalName} onChange={(e) => setNewTerminalName(e.target.value)} required className="w-full px-3 py-2 border border-neutral-300 bg-neutral rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-neutral-900 placeholder:text-neutral-400" /> {/* Adjusted text color */}
                </div>
                {/* Apple-style button */}
                <button type="submit" disabled={isAdding} className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-60 disabled:cursor-not-allowed h-[42px]">{isAdding ? "Adding..." : "Add"}</button>
            </form>
            <div className="space-y-3"> {/* Increased spacing */}
                {terminals.length === 0 && <p className="text-neutral-500 text-center py-4">No terminals created yet.</p>}
                {terminals.map((terminal) => (
                    <div key={terminal.id} className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg bg-neutral-50"> {/* Adjusted padding, border, bg */}
                        {editingTerminalId === terminal.id ? (
                            <>
                                <input type="text" value={editingTerminalName} onChange={(e) => setEditingTerminalName(e.target.value)} className="px-3 py-1.5 border border-neutral-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent flex-grow mr-2 text-neutral-900" autoFocus /> {/* Adjusted text color */}
                                {/* Apple-style buttons */}
                                <button onClick={() => handleEditSave(terminal.id)} className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium py-1.5 px-3 rounded-md mr-1">Save</button>
                                <button onClick={handleEditCancel} className="text-sm bg-neutral-500 hover:bg-neutral-600 text-white font-medium py-1.5 px-3 rounded-md">Cancel</button>
                            </>
                        ) : (
                            <>
                                <span className="font-medium text-neutral-900">{terminal.name}</span> {/* Adjusted text color */}
                                <div className="flex items-center gap-2">
                                     {/* Subtle text button */}
                                     <button onClick={() => handleEditClick(terminal)} className="text-sm text-blue-600 hover:text-blue-700 font-medium">Edit</button>
                                     {/* Apple-style toggle/action buttons */}
                                    <button onClick={() => handleToggleOpen(terminal)} className={`text-sm font-medium py-1 px-3 rounded-md ${terminal.isOpen ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'bg-neutral-500 hover:bg-neutral-600 text-white'}`}>{terminal.isOpen ? "Set Closed" : "Set Open"}</button>
                                    <button onClick={() => handleDeleteClick(terminal.id, terminal.name)} className="text-sm bg-red-600 hover:bg-red-700 text-white font-medium py-1 px-3 rounded-md">Delete</button>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

import Link from 'next/link'; // Added for navigation

// --- Main Dashboard Component ---
export default function AdminDashboard() {
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [teams, setTeams] = useState<Team[]>([]); // Added state for teams
  const [participants, setParticipants] = useState<Participant[]>([]); // Added state for participants
  const [waitingTickets, setWaitingTickets] = useState<SupportTicket[]>([]);
  const [queuedTickets, setQueuedTickets] = useState<SupportTicket[]>([]);

  const [newTicketTeamId, setNewTicketTeamId] = useState(""); // Changed state name
  const [newTicketParticipantId, setNewTicketParticipantId] = useState(""); // Changed state name
  const [newTicketTopic, setNewTicketTopic] = useState("");
  const [isAddingTicket, setIsAddingTicket] = useState(false);

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  // State for Editing Ticket
  const [isEditingTicket, setIsEditingTicket] = useState(false);
  const [editingTicket, setEditingTicket] = useState<SupportTicket | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // --- Data Fetching ---
  useEffect(() => { /* Terminals */
    const q = query(collection(db, "terminals"), orderBy("name"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => { const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Terminal)); setTerminals(data); }); return () => unsubscribe();
  }, []);
  useEffect(() => { /* Teams */
    const q = query(collection(db, "teams"), orderBy("name"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => { const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team)); setTeams(data); }); return () => unsubscribe();
  }, []);
  useEffect(() => { /* Participants */
    const q = query(collection(db, "participants"), orderBy("name")); // Fetch all initially, filter in UI
    const unsubscribe = onSnapshot(q, (querySnapshot) => { const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Participant)); setParticipants(data); }); return () => unsubscribe();
  }, []);
  useEffect(() => { /* Waiting Tickets */
    const q = query(collection(db, "supportTickets"), where("status", "==", "waiting_assignment"), orderBy("requestTimestamp", "asc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => { const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportTicket)); setWaitingTickets(data); }); return () => unsubscribe();
  }, []);
  useEffect(() => { /* Queued/Active Tickets */
    const q = query(collection(db, "supportTickets"), where("status", "in", ["queued", "called", "in_progress"]));
    const unsubscribe = onSnapshot(q, (querySnapshot) => { const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportTicket)); setQueuedTickets(data); }); return () => unsubscribe();
  }, []);

  // --- Memoized Ticket Grouping ---
  const ticketsByTerminal = useMemo(() => { /* ... */
    const grouped: { [key: string]: SupportTicket[] } = {};
    terminals.forEach(terminal => { const ticketsInTerminal = queuedTickets.filter(t => t.assignedTerminalId === terminal.id); grouped[terminal.id] = ticketsInTerminal.sort((a, b) => { const indexA = terminal.queueOrder.indexOf(a.id); const indexB = terminal.queueOrder.indexOf(b.id); if (indexA === -1) return 1; if (indexB === -1) return -1; return indexA - indexB; }); }); return grouped;
  }, [terminals, queuedTickets]);

  // --- Firestore CRUD Functions ---
  async function handleAddTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!newTicketTeamId || !newTicketTopic.trim() || isAddingTicket) {
      alert("Please select a Team and enter a Topic.");
      return;
    }

    const selectedTeam = teams.find(t => t.id === newTicketTeamId);
    if (!selectedTeam) {
        alert("Selected team not found.");
        return;
    }
    if(selectedTeam.ticketCount <= 0) {
      alert("Ticket หมดแล้วจ้า")
      return;
    }

    // Participant is optional, but if selected, find it
    let selectedParticipant: Participant | undefined = undefined;
    if (newTicketParticipantId) {
        selectedParticipant = participants.find(p => p.id === newTicketParticipantId && p.teamID === newTicketTeamId);
        if (!selectedParticipant) {
            alert("Selected participant not found or does not belong to the selected team.");
            // Optionally reset participant selection or handle differently
            // setNewTicketParticipantId(""); // Example: Reset if invalid
            return; // Stop submission if participant is selected but invalid
        }
    }


    setIsAddingTicket(true);
    try {
      await addDoc(collection(db, "supportTickets"), {
        teamId: selectedTeam.id,
        teamName: selectedTeam.name, // Denormalized
        participantUUID: selectedParticipant?.id ?? null, // Use selected ID or null
        participantName: selectedParticipant?.name ?? "N/A", // Denormalized or N/A
        topic: newTicketTopic.trim(),
        status: "waiting_assignment",
        requestTimestamp: serverTimestamp(),
        assignedTerminalId: null,
        assignedTerminalName: null,
        calledTimestamp: null,
        startedTimestamp: null,
        completedTimestamp: null,
        supportTimeLimit: null,
      });
      await updateDoc(doc(db, "teams", selectedTeam.id), { ticketCount: increment(-1) })
      setNewTicketTeamId(""); // Reset selection
      setNewTicketParticipantId(""); // Reset selection
      setNewTicketTopic("");
    } catch (error) {
      console.error("Error adding ticket:", error);
      alert("Failed to add ticket.");
    } finally {
      setIsAddingTicket(false);
    }
  }
  async function addTerminal(name: string) { /* ... */ await addDoc(collection(db, "terminals"), { name: name, isOpen: true, queueOrder: [], assignedStaffId: null, currentTicketId: null }); }
  async function updateTerminal(id: string, updates: Partial<Terminal>) { /* ... */ const terminalRef = doc(db, "terminals", id); await updateDoc(terminalRef, updates); }
  async function deleteTerminal(id: string) { /* ... */ const terminal = terminals.find(t => t.id === id); if (terminal && (ticketsByTerminal[id] || []).length > 0) { alert(`Cannot delete terminal "${terminal.name}" because it has tickets assigned. Move or complete tickets first.`); return; } const terminalRef = doc(db, "terminals", id); await deleteDoc(terminalRef); }
  // Removed addTeam, updateTeam, deleteTeam, addParticipant, updateParticipant, deleteParticipant functions


  // --- Ticket CRUD Handlers ---
  async function updateTicket(ticketId: string, updates: Partial<SupportTicket>) {
    const ticketRef = doc(db, "supportTickets", ticketId);
    await updateDoc(ticketRef, updates);
    console.log(`Updated ticket ${ticketId}`);
    // Note: No need to manually update local state if using onSnapshot
  }

  function handleEditTicketClick(ticket: SupportTicket) {
    console.log("Editing ticket:", ticket);
    setEditingTicket(ticket);
    setIsEditingTicket(true);
    // TODO: Implement modal display logic
  }

  async function handleDeleteTicketClick(ticketId: string, teamName: string, topic: string) {
    if (window.confirm(`Are you sure you want to delete ticket for "${teamName}" about "${topic}"?`)) {
      console.log("Deleting ticket:", ticketId);
      const ticketRef = doc(db, "supportTickets", ticketId);
      const supportTicketSnap = await getDoc(ticketRef);
      try {
        // Before deleting, check if it's the current ticket in any terminal
        const terminalsUsingTicket = terminals.filter(t => t.currentTicketId === ticketId);
        if (terminalsUsingTicket.length > 0) {
            alert(`Cannot delete ticket: It is currently active or called at terminal(s): ${terminalsUsingTicket.map(t => t.name).join(', ')}. Please end support first.`);
            return;
        }

        // Also remove from queueOrder if it exists there
        const batch = writeBatch(db);
        terminals.forEach(terminal => {
            if (terminal.queueOrder.includes(ticketId)) {
                const terminalRef = doc(db, "terminals", terminal.id);
                batch.update(terminalRef, { queueOrder: arrayRemove(ticketId) });
            }
        });

        // refund Teams ticketCount
        if (supportTicketSnap.exists()) {
          const supportTicketData = supportTicketSnap.data();

          await updateDoc(doc(db, "teams", supportTicketData.teamId), { ticketCount: increment(1) })
          console.log(`Refund ticket to team ${supportTicketData.teamId}.`);
        } else {
          alert("Failed to refund ticket, Please update manually.")
        }

        batch.delete(ticketRef); // Delete the ticket itself
        await batch.commit();
        console.log(`Deleted ticket ${ticketId} and removed from queues.`);

      } catch (error) {
        console.error("Error deleting ticket:", error);
        alert("Failed to delete ticket.");
      }
    }
  }

  // --- Call/Start/End Support Handlers ---
  async function handleCallNext(terminalId: string) { /* ... */ const terminal = terminals.find(t => t.id === terminalId); const nextTicketId = terminal?.queueOrder.find(id => id !== terminal.currentTicketId); if (!terminal || terminal.currentTicketId || !nextTicketId) { console.warn("Cannot call next.", { terminal, nextTicketId }); alert("Terminal is busy or queue is empty."); return; } const batch = writeBatch(db); const terminalRef = doc(db, "terminals", terminalId); const ticketRef = doc(db, "supportTickets", nextTicketId); batch.update(terminalRef, { currentTicketId: nextTicketId }); batch.update(ticketRef, { status: 'called', calledTimestamp: serverTimestamp() }); try { await batch.commit(); console.log(`Called ticket ${nextTicketId} for terminal ${terminalId}`); } catch (error) { console.error("Error calling next ticket:", error); alert("Failed to call next ticket."); } }
  async function handleStartSupport(terminalId: string, ticketId: string) { /* ... */ if (!terminalId || !ticketId) return; const terminal = terminals.find(t => t.id === terminalId); if (!terminal || terminal.currentTicketId !== ticketId) { alert("Ticket is not the currently called ticket for this terminal."); return; } const ticketRef = doc(db, "supportTickets", ticketId); try { await updateDoc(ticketRef, { status: 'in_progress', startedTimestamp: serverTimestamp() }); console.log(`Started support for ticket ${ticketId}`); } catch (error) { console.error("Error starting support:", error); alert("Failed to start support."); } }
  async function handleEndSupport(terminalId: string, ticketId: string) { /* ... */ if (!terminalId || !ticketId) return; const terminal = terminals.find(t => t.id === terminalId); if (!terminal || terminal.currentTicketId !== ticketId) { alert("Ticket is not the currently active ticket for this terminal."); return; } const batch = writeBatch(db); const terminalRef = doc(db, "terminals", terminalId); const ticketRef = doc(db, "supportTickets", ticketId); batch.update(terminalRef, { currentTicketId: null, queueOrder: arrayRemove(ticketId) }); batch.update(ticketRef, { status: 'completed', completedTimestamp: serverTimestamp() }); try { await batch.commit(); console.log(`Ended support for ticket ${ticketId} at terminal ${terminalId}`); } catch (error) { console.error("Error ending support:", error); alert("Failed to end support."); } }

  // --- Drag Handlers ---
  function handleDragStart(event: DragStartEvent) { setActiveId(event.active.id); }
  async function handleDragEnd(event: DragEndEvent) { /* ... */ setActiveId(null); const { active, over } = event; if (!over || active.id === over.id) return; const activeIdStr = active.id as string; const overIdStr = over.id as string; const activeTicket = [...waitingTickets, ...queuedTickets].find(t => t.id === activeIdStr); if (!activeTicket) return; let targetContainerId: string | null = null; const overIsKnownContainer = overIdStr === WAITING_LIST_ID || terminals.some(t => t.id === overIdStr); if (overIsKnownContainer) { targetContainerId = overIdStr; } else { const overTicket = [...waitingTickets, ...queuedTickets].find(t => t.id === overIdStr); if (overTicket) { targetContainerId = overTicket.status === 'waiting_assignment' ? WAITING_LIST_ID : overTicket.assignedTerminalId; } } if (!targetContainerId) { console.warn("Could not determine target container ID from over object:", over); return; } const sourceContainerId = activeTicket.status === 'waiting_assignment' ? WAITING_LIST_ID : activeTicket.assignedTerminalId; if (sourceContainerId === WAITING_LIST_ID && targetContainerId === WAITING_LIST_ID) { console.log("Cannot reorder within waiting list."); return; } console.log(`Moving ticket ${activeIdStr} from ${sourceContainerId} to ${targetContainerId}`); const batch = writeBatch(db); const ticketRef = doc(db, "supportTickets", activeIdStr); try { let newStatus: SupportTicketStatus = 'queued'; let newTerminalId: string | null = null; let newTerminalName: string | null = null; if (targetContainerId === WAITING_LIST_ID) { newStatus = 'waiting_assignment'; } else { const targetTerminal = terminals.find(t => t.id === targetContainerId); if (targetTerminal) { newTerminalId = targetTerminal.id; newTerminalName = targetTerminal.name; if (sourceContainerId === targetContainerId && (activeTicket.status === 'called' || activeTicket.status === 'in_progress')) { newStatus = activeTicket.status; } else { newStatus = 'queued'; } } else { console.error(`Target terminal data not found in state for ID: ${targetContainerId}. Aborting Firestore update.`); return; } } batch.update(ticketRef, { status: newStatus, assignedTerminalId: newTerminalId, assignedTerminalName: newTerminalName }); if (sourceContainerId && sourceContainerId !== WAITING_LIST_ID) { const sourceTerminalRef = doc(db, "terminals", sourceContainerId); batch.update(sourceTerminalRef, { queueOrder: arrayRemove(activeIdStr) }); } if (targetContainerId && targetContainerId !== WAITING_LIST_ID) { const targetTerminalRef = doc(db, "terminals", targetContainerId); const targetTerminalData = terminals.find(t => t.id === targetContainerId); const currentQueueOrder = targetTerminalData?.queueOrder || []; if (sourceContainerId === targetContainerId) { const oldIndex = currentQueueOrder.indexOf(activeIdStr); const newIndex = currentQueueOrder.indexOf(overIdStr); if (oldIndex !== -1 && newIndex !== -1) { console.log(`Reordering in ${targetContainerId}: ${activeIdStr} from ${oldIndex} to index ${newIndex} (relative to ${overIdStr})`); const newQueueOrder = arrayMove(currentQueueOrder, oldIndex, newIndex); batch.update(targetTerminalRef, { queueOrder: newQueueOrder }); } else if (oldIndex !== -1) { console.log(`Reordering in ${targetContainerId}: Moving ${activeIdStr} from ${oldIndex} to end (fallback).`); const tempOrder = currentQueueOrder.filter(id => id !== activeIdStr); tempOrder.push(activeIdStr); batch.update(targetTerminalRef, { queueOrder: tempOrder }); } else { console.error("Error during reorder: oldIndex not found."); } } else { console.log(`Adding ${activeIdStr} to end of ${targetContainerId}`); batch.update(targetTerminalRef, { queueOrder: arrayUnion(activeIdStr) }); } } await batch.commit(); console.log("Firestore updated successfully."); } catch (error) { console.error("Error updating Firestore:", error); } }

  const draggedTicket = activeId ? [...waitingTickets, ...queuedTickets].find(t => t.id === activeId) : null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <main className="flex min-h-screen flex-col items-center p-8 bg-white text-neutral-900">
        <h1 className="text-3xl font-semibold mb-4">Admin Dashboard</h1>
        <div className="mb-4">
            <Link href="/manage/teams" className="text-blue-500 hover:text-blue-600 underline">Manage Teams & Participants</Link>
        </div>

        {/* Add New Ticket Form */}
        {/* Apply Apple-like styling: semi-transparent background, blur, rounded corners, subtle border */}
        <form onSubmit={handleAddTicket} className="mb-8 p-6 bg-white/70 backdrop-blur-md rounded-xl shadow-sm border border-neutral-200 w-full max-w-md">
            <h2 className="text-lg font-medium mb-4 text-center">Add New Ticket</h2>
             <div className="mb-3"> {/* Increased margin */}
                <label htmlFor="teamId" className="block text-sm font-medium text-neutral-700 mb-1">Team *</label>
                <select
                    id="teamId"
                    value={newTicketTeamId}
                    onChange={(e) => { setNewTicketTeamId(e.target.value); setNewTicketParticipantId(""); /* Reset participant on team change */ }}
                    required
                    className="w-full px-3 py-2 border border-neutral-300 bg-neutral rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-neutral-900 placeholder:text-neutral-400"
                >
                    <option value="" disabled>Select Team</option>
                    {teams.map(team => (
                        <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                </select>
            </div>
             <div className="mb-3"> {/* Increased margin */}
                <label htmlFor="participantId" className="block text-sm font-medium text-neutral-700 mb-1">Participant (Optional)</label>
                <select
                    id="participantId"
                    value={newTicketParticipantId}
                    onChange={(e) => setNewTicketParticipantId(e.target.value)}
                    disabled={!newTicketTeamId} // Disable if no team is selected
                    className="w-full px-3 py-2 border border-neutral-300 bg-neutral rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-neutral-900 placeholder:text-neutral-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <option value="" disabled={!newTicketTeamId}>Select Participant</option>
                    {participants
                        .filter(p => p.teamID === newTicketTeamId) // Filter participants by selected team
                        .map(participant => (
                            <option key={participant.id} value={participant.id}>{participant.name}</option>
                        ))
                    }
                </select>
            </div>
            <div className="mb-5"> {/* Increased margin */}
                <label htmlFor="topic" className="block text-sm font-medium text-neutral-700 mb-1">Topic *</label>
                <input type="text" id="topic" value={newTicketTopic} onChange={(e) => setNewTicketTopic(e.target.value)} required className="w-full px-3 py-2 border border-neutral-300 bg-neutral rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-neutral-900 placeholder:text-neutral-400" />
            </div>
            {/* Apple-style primary button */}
            <button type="submit" disabled={isAddingTicket || !newTicketTeamId} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed">{isAddingTicket ? "Adding..." : "Add Ticket"}</button>
        </form>

        {/* Management Sections - Only Terminal Manager remains */}
        <div className="w-full flex flex-col items-center gap-8">
            <TerminalManager terminals={terminals} onAdd={addTerminal} onUpdate={updateTerminal} onDelete={deleteTerminal} />
        </div>

        {/* Ticket Queues Section */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mt-8"> {/* Adjusted grid cols and gap */}
          <DroppableContainer
            id={WAITING_LIST_ID}
            title="Waiting for Assignment"
            items={waitingTickets}
            itemCount={waitingTickets.length}
            // Pass handlers down to SortableTicket inside DroppableContainer
            onEdit={handleEditTicketClick}
            onDelete={handleDeleteTicketClick}
          />
          {terminals.map((terminal) => (
            <DroppableContainer
              key={terminal.id}
              id={terminal.id}
              title={`${terminal.name} (${terminal.isOpen ? "Open" : "Closed"})`}
              items={ticketsByTerminal[terminal.id] || []}
              isOpen={terminal.isOpen}
              itemCount={(ticketsByTerminal[terminal.id] || []).length}
              terminalData={terminal}
              onCallNext={handleCallNext}
              onStartSupport={handleStartSupport}
              onEndSupport={handleEndSupport}
              // Pass handlers down to SortableTicket inside DroppableContainer
              onEdit={handleEditTicketClick}
              onDelete={handleDeleteTicketClick}
            />
          ))}
        </div>
      </main>

      {/* Edit Ticket Modal */}
      <EditTicketModal
        isOpen={isEditingTicket}
        ticket={editingTicket}
        onClose={() => { setIsEditingTicket(false); setEditingTicket(null); }}
        onSave={updateTicket}
      />

      {/* Apply styles to the overlay ticket */}
      <DragOverlay dropAnimation={null}>
        {draggedTicket ? <SortableTicket ticket={draggedTicket} isOverlay={true} onEdit={() => {}} onDelete={() => {}} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
