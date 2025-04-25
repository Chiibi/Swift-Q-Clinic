"use client";

import React, { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase/config";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  addDoc,
  deleteDoc,
  updateDoc,
  setDoc,
  arrayUnion, // Use setDoc for adding participant with specific UUID
} from "firebase/firestore";
import { Team, Participant } from "@/lib/firebase/types";
import Link from 'next/link'; // For navigation back

// --- Team Management Component (Moved from page.tsx) ---
interface TeamManagerProps {
    teams: Team[];
    participants: Participant[];
    onAddTeam: (name: string, initialTickets: number) => Promise<void>;
    onUpdateTeam: (id: string, updates: Partial<Team>) => Promise<void>;
    onDeleteTeam: (id: string) => Promise<void>;
    onAddParticipant: (name: string, uuid: string, teamId: string) => Promise<void>;
    onUpdateParticipant: (id: string, updates: Partial<Participant>) => Promise<void>;
    onDeleteParticipant: (id: string) => Promise<void>;
}
function TeamManager({ teams, participants, onAddTeam, onUpdateTeam, onDeleteTeam, onAddParticipant, onUpdateParticipant, onDeleteParticipant }: TeamManagerProps) {
    const [newTeamName, setNewTeamName] = useState("");
    const [newTeamTickets, setNewTeamTickets] = useState<number>(5);
    const [isAddingTeam, setIsAddingTeam] = useState(false);
    const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
    const [editingTeamName, setEditingTeamName] = useState("");
    const [editingTeamTickets, setEditingTeamTickets] = useState<number>(0);

    // State for adding participant
    const [addingParticipantToTeamId, setAddingParticipantToTeamId] = useState<string | null>(null);
    const [newParticipantName, setNewParticipantName] = useState("");
    const [newParticipantUUID, setNewParticipantUUID] = useState(""); // UUID is the doc ID
    const [isAddingParticipant, setIsAddingParticipant] = useState(false);

    // State for editing participant
    const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
    const [editingParticipantName, setEditingParticipantName] = useState("");
    const [editingParticipantTeamId, setEditingParticipantTeamId] = useState("");


    async function handleAddTeamSubmit(e: React.FormEvent) { e.preventDefault(); if (!newTeamName.trim() || newTeamTickets < 0 || isAddingTeam) return; setIsAddingTeam(true); try { await onAddTeam(newTeamName.trim(), newTeamTickets); setNewTeamName(""); setNewTeamTickets(5); } catch (error) { console.error("Failed to add team:", error); alert("Failed to add team."); } finally { setIsAddingTeam(false); } }
    async function handleDeleteTeamClick(id: string, name: string) { if (window.confirm(`Are you sure you want to delete team "${name}"? This cannot be undone.`)) { try { await onDeleteTeam(id); } catch (error) { console.error("Failed to delete team:", error); alert("Failed to delete team."); } } }
    function handleEditTeamClick(team: Team) { setEditingTeamId(team.id); setEditingTeamName(team.name); setEditingTeamTickets(team.initialTicketCount); }
    async function handleEditTeamSave(id: string) { if (!editingTeamName.trim() || editingTeamTickets < 0) return; try { await onUpdateTeam(id, { name: editingTeamName.trim(), initialTicketCount: editingTeamTickets }); setEditingTeamId(null); } catch (error) { console.error("Failed to update team:", error); alert("Failed to update team."); } }
    function handleEditTeamCancel() { setEditingTeamId(null); }

    // Participant Handlers
    function handleShowAddParticipant(teamId: string) { setAddingParticipantToTeamId(teamId); setNewParticipantName(""); setNewParticipantUUID(""); }
    function handleCancelAddParticipant() { setAddingParticipantToTeamId(null); }
    async function handleAddParticipantSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!newParticipantName.trim() || !newParticipantUUID.trim() || !addingParticipantToTeamId || isAddingParticipant) return;
        setIsAddingParticipant(true);
        try {
            await onAddParticipant(newParticipantName.trim(), newParticipantUUID.trim(), addingParticipantToTeamId);
            handleCancelAddParticipant(); // Close form on success
        } catch (error) { console.error("Failed to add participant:", error); alert("Failed to add participant."); }
        finally { setIsAddingParticipant(false); }
    }
    async function handleDeleteParticipantClick(id: string, name: string) { if (window.confirm(`Delete participant "${name}"?`)) { try { await onDeleteParticipant(id); } catch (error) { console.error("Failed to delete participant:", error); alert("Failed to delete participant."); } } }
    function handleEditParticipantClick(participant: Participant) { setEditingParticipantId(participant.id); setEditingParticipantName(participant.name); setEditingParticipantTeamId(participant.teamId); }
    async function handleEditParticipantSave(id: string) { if (!editingParticipantName.trim() || !editingParticipantTeamId) return; try { await onUpdateParticipant(id, { name: editingParticipantName.trim(), teamId: editingParticipantTeamId }); setEditingParticipantId(null); } catch (error) { console.error("Failed to update participant:", error); alert("Failed to update participant."); } }
    function handleEditParticipantCancel() { setEditingParticipantId(null); }


    const participantsByTeam = useMemo(() => {
        const grouped: { [teamId: string]: Participant[] } = {};
        participants.forEach(p => {
            if (!grouped[p.teamId]) grouped[p.teamId] = [];
            grouped[p.teamId].push(p);
        });
        return grouped;
    }, [participants]);

    return (
        <div className="mb-8 p-4 bg-white rounded shadow border border-gray-200 w-full max-w-4xl">
            <h2 className="text-xl font-semibold mb-4 text-center">Manage Teams & Participants</h2>
            {/* Add Team Form */}
            <form onSubmit={handleAddTeamSubmit} className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2 mb-6 items-end border-b pb-4">
                 <div className="flex-grow"> <label htmlFor="teamName" className="block text-sm font-medium text-gray-700 mb-1">New Team Name</label> <input type="text" id="teamName" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" /> </div>
                 <div> <label htmlFor="teamTickets" className="block text-sm font-medium text-gray-700 mb-1">Initial Tickets</label> <input type="number" id="teamTickets" value={newTeamTickets} onChange={(e) => setNewTeamTickets(parseInt(e.target.value, 10) || 0)} required min="0" className="w-full md:w-24 px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" /> </div>
                 <button type="submit" disabled={isAddingTeam} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 h-10 mt-auto">{isAddingTeam ? "Adding..." : "Add Team"}</button>
            </form>

            {/* Teams List */}
            <div className="space-y-4">
                {teams.length === 0 && <p className="text-gray-500">No teams created yet.</p>}
                {teams.map((team) => (
                    <div key={team.id} className="p-3 border rounded bg-gray-50">
                        {/* Team Edit/Display */}
                        <div className="flex items-center justify-between mb-2">
                             {editingTeamId === team.id ? (
                                <>
                                    <input type="text" value={editingTeamName} onChange={(e) => setEditingTeamName(e.target.value)} className="px-2 py-1 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 flex-grow mr-2" autoFocus />
                                    <input type="number" value={editingTeamTickets} onChange={(e) => setEditingTeamTickets(parseInt(e.target.value, 10) || 0)} min="0" className="w-20 px-2 py-1 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 mr-2" />
                                    <button onClick={() => handleEditTeamSave(team.id)} className="text-sm bg-blue-500 hover:bg-blue-600 text-white py-1 px-2 rounded mr-1">Save</button>
                                    <button onClick={handleEditTeamCancel} className="text-sm bg-gray-400 hover:bg-gray-500 text-white py-1 px-2 rounded">Cancel</button>
                                </>
                            ) : (
                                <>
                                    <span className="font-medium text-lg">{team.name}</span>
                                    <span className="text-sm text-gray-600 ml-4">Tickets: {team.ticketCount} / {team.initialTicketCount}</span>
                                    <div className="flex items-center gap-2 ml-auto">
                                         <button onClick={() => handleEditTeamClick(team)} className="text-sm text-blue-600 hover:text-blue-800">Edit Team</button>
                                        <button onClick={() => handleDeleteTeamClick(team.id, team.name)} className="text-sm bg-red-500 hover:bg-red-600 text-white py-1 px-2 rounded">Delete Team</button>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Participant Management for this team */}
                        <div className="pl-4 mt-2 border-l-2 border-gray-200">
                            <h4 className="text-sm font-semibold mb-1 text-gray-700">Participants ({ (participantsByTeam[team.id] || []).length })</h4>
                             {/* Add Participant Form (conditional) */}
                             {addingParticipantToTeamId === team.id ? (
                                <form onSubmit={handleAddParticipantSubmit} className="flex flex-wrap gap-2 items-end mb-2 p-2 bg-gray-100 rounded">
                                    <div className="flex-grow min-w-[150px]"> <label htmlFor={`pName-${team.id}`} className="block text-xs font-medium text-gray-600">Name</label> <input type="text" id={`pName-${team.id}`} value={newParticipantName} onChange={e => setNewParticipantName(e.target.value)} required className="w-full px-2 py-1 border border-gray-300 rounded shadow-sm text-sm" /> </div>
                                    <div className="flex-grow min-w-[200px]"> <label htmlFor={`pUUID-${team.id}`} className="block text-xs font-medium text-gray-600">UUID (NFC Tag ID)</label> <input type="text" id={`pUUID-${team.id}`} value={newParticipantUUID} onChange={e => setNewParticipantUUID(e.target.value)} required className="w-full px-2 py-1 border border-gray-300 rounded shadow-sm text-sm" /> </div>
                                    <button type="submit" disabled={isAddingParticipant} className="text-xs bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-2 rounded disabled:opacity-50 h-7 mt-auto">{isAddingParticipant ? "..." : "Save"}</button>
                                    <button type="button" onClick={handleCancelAddParticipant} className="text-xs bg-gray-400 hover:bg-gray-500 text-white font-bold py-1 px-2 rounded h-7 mt-auto">Cancel</button>
                                </form>
                             ) : (
                                 <button onClick={() => handleShowAddParticipant(team.id)} className="text-xs bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-2 rounded mb-2">Add Participant</button>
                             )}

                            {/* Participant List */}
                            {(participantsByTeam[team.id] || []).map(participant => (
                                <div key={participant.id} className="flex items-center justify-between text-sm py-1">
                                    {editingParticipantId === participant.id ? (
                                        <>
                                            <input type="text" value={editingParticipantName} onChange={e => setEditingParticipantName(e.target.value)} className="px-1 py-0.5 border border-gray-300 rounded shadow-sm text-sm flex-grow mr-2" autoFocus />
                                            {/* Optional: Allow changing team */}
                                            <select value={editingParticipantTeamId} onChange={e => setEditingParticipantTeamId(e.target.value)} className="px-1 py-0.5 border border-gray-300 rounded shadow-sm text-sm mr-2">
                                                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                            </select>
                                            <button onClick={() => handleEditParticipantSave(participant.id)} className="text-xs bg-blue-500 hover:bg-blue-600 text-white py-0.5 px-1 rounded mr-1">Save</button>
                                            <button onClick={handleEditParticipantCancel} className="text-xs bg-gray-400 hover:bg-gray-500 text-white py-0.5 px-1 rounded">Cancel</button>
                                        </>
                                    ) : (
                                        <>
                                            <span>{participant.name} <code className="text-xs text-gray-500">({participant.id})</code></span>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => handleEditParticipantClick(participant)} className="text-xs text-blue-600 hover:text-blue-800">Edit</button>
                                                <button onClick={() => handleDeleteParticipantClick(participant.id, participant.name)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                             {(participantsByTeam[team.id] || []).length === 0 && !addingParticipantToTeamId && (
                                <p className="text-xs text-gray-500 italic">No participants added yet.</p>
                             )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}


// --- Main Page Component ---
export default function ManageTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);

  // --- Data Fetching ---
  useEffect(() => { /* Teams */
    const q = query(collection(db, "teams"), orderBy("name"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => { const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team)); setTeams(data); }); return () => unsubscribe();
  }, []);
  useEffect(() => { /* Participants */
    const q = query(collection(db, "participants"), orderBy("name")); // Order participants globally by name
    const unsubscribe = onSnapshot(q, (querySnapshot) => { const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Participant)); setParticipants(data); }); return () => unsubscribe();
  }, []);

  // --- Firestore CRUD Functions ---
  async function addTeam(name: string, initialTickets: number) { await addDoc(collection(db, "teams"), { name: name, initialTicketCount: initialTickets, ticketCount: initialTickets, members: [] }); }
  async function updateTeam(id: string, updates: Partial<Team>) { const teamRef = doc(db, "teams", id); await updateDoc(teamRef, updates); }
  async function deleteTeam(id: string) {
    // Basic delete - TODO: Consider cascading deletes or warnings for participants/tickets
    const teamRef = doc(db, "teams", id);
    await deleteDoc(teamRef);
    console.log(`Deleted team ${id}`);
    // Potential enhancement: Query and delete associated participants, or reassign them.
  }
  async function addParticipant(name: string, uuid: string, teamId: string) {
    const participantRef = doc(db, "participants", uuid); // Use UUID as document ID
    await setDoc(participantRef, { name: name, teamId: teamId }); // Use setDoc to ensure the specific ID is used
    console.log(`Added participant ${name} (${uuid}) to team ${teamId}`);
    // Optionally add participant ref/name to team members array?
    const teamRef = doc(db, "teams", teamId);
    await updateDoc(teamRef, { members: arrayUnion(uuid) });
  }
  async function updateParticipant(id: string, updates: Partial<Participant>) {
    const participantRef = doc(db, "participants", id);
    await updateDoc(participantRef, updates);
    console.log(`Updated participant ${id}`);
  }
  async function deleteParticipant(id: string) {
    const participantRef = doc(db, "participants", id);
    await deleteDoc(participantRef);
    console.log(`Deleted participant ${id}`);
    // TODO: Update team members array if needed
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-gray-100">
      <div className="w-full max-w-4xl mb-4">
        <Link href="/" className="text-blue-600 hover:text-blue-800">&larr; Back to Dashboard</Link>
      </div>
      <TeamManager
        teams={teams}
        participants={participants}
        onAddTeam={addTeam}
        onUpdateTeam={updateTeam}
        onDeleteTeam={deleteTeam}
        onAddParticipant={addParticipant}
        onUpdateParticipant={updateParticipant}
        onDeleteParticipant={deleteParticipant}
      />
    </main>
  );
}