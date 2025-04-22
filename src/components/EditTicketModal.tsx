"use client";

import React, { useState, useEffect } from 'react';
import { SupportTicket } from '@/lib/firebase/types';

interface EditTicketModalProps {
  ticket: SupportTicket | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (ticketId: string, updates: Partial<SupportTicket>) => Promise<void>;
}

export default function EditTicketModal({ ticket, isOpen, onClose, onSave }: EditTicketModalProps) {
  const [topic, setTopic] = useState('');
  // Add states for other editable fields like teamId, participantId later if needed
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (ticket) {
      setTopic(ticket.topic);
      // Reset other fields based on ticket data
    } else {
      // Reset fields when modal is closed or no ticket
      setTopic('');
    }
  }, [ticket]);

  if (!isOpen || !ticket) {
    return null;
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || isSaving) return;

    setIsSaving(true);
    try {
      const updates: Partial<SupportTicket> = {
        topic: topic.trim(),
        // Add other updated fields here
      };
      await onSave(ticket.id, updates);
      onClose(); // Close modal on successful save
    } catch (error) {
      console.error("Failed to save ticket:", error);
      alert("Failed to save ticket changes.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex justify-center items-center p-4">
      <div className="relative mx-auto p-6 border border-neutral-200 dark:border-neutral-700 w-full max-w-md shadow-xl rounded-xl bg-white/80 dark:bg-neutral-800/80 backdrop-blur-lg text-[var(--foreground)]">
        <h3 className="text-lg font-medium leading-6 mb-5">Edit Ticket</h3>
        <form onSubmit={handleSave}>
          <div className="mb-4">
            <label htmlFor="edit-teamName" className="block text-sm font-medium text-[var(--foreground)] mb-1">Team</label>
            <input
              type="text"
              id="edit-teamName"
              value={ticket!.teamName}
              disabled // Team/Participant selection will be added later
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md shadow-sm bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 cursor-not-allowed"
            />
          </div>
           <div className="mb-4">
            <label htmlFor="edit-participantName" className="block text-sm font-medium text-[var(--foreground)] mb-1">Participant</label>
            <input
              type="text"
              id="edit-participantName"
              value={ticket!.participantName || 'N/A'}
              disabled // Team/Participant selection will be added later
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md shadow-sm bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 cursor-not-allowed"
            />
          </div>
          <div className="mb-5"> {/* Increased margin */}
            <label htmlFor="edit-topic" className="block text-sm font-medium text-[var(--foreground)] mb-1">Topic *</label>
            <input
              type="text"
              id="edit-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[var(--foreground)] placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
            />
          </div>
          {/* Add other editable fields here */}
          <div className="flex justify-end gap-3 mt-6"> {/* Increased gap */}
            {/* Apple-style Cancel button */}
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 bg-neutral-200 dark:bg-neutral-600 text-neutral-800 dark:text-neutral-100 rounded-md hover:bg-neutral-300 dark:hover:bg-neutral-500 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            {/* Apple-style Save button */}
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}