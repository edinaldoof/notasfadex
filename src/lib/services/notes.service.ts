import prisma from "../../../lib/prisma";
import { NoteStatus, HistoryType } from "@prisma/client";

/**
 * Processes expired notes.
 * Finds all pending notes past their attestation deadline,
 * updates their status to EXPIRED, and logs a history event.
 *
 * @returns An object with the count of updated notes.
 */
export async function processExpiredNotes(): Promise<{ updatedCount: number }> {
  const now = new Date();

  const expiredNotes = await prisma.note.findMany({ // CORRIGIDO: de fiscalNote para note
    where: {
      status: NoteStatus.PENDENTE, // CORRIGIDO: de NoteStatus para NoteStatus
      attestationDeadline: {
        lt: now,
      },
    },
  });

  if (expiredNotes.length === 0) {
    return { updatedCount: 0 };
  }

  const expiredNoteIds = expiredNotes.map((note) => note.id);

  const { count } = await prisma.note.updateMany({ // CORRIGIDO: de fiscalNote para note
    where: {
      id: {
        in: expiredNoteIds,
      },
    },
    data: {
      status: NoteStatus.EXPIRADA, // CORRIGIDO: de NoteStatus para NoteStatus
    },
  });

  const historyEvents = expiredNotes.map((note) => ({
    noteId: note.id, // CORRIGIDO: de fiscalNoteId para noteId
    type: HistoryType.EXPIRED,
    details: `A nota expirou em ${now.toLocaleDateString(
      "pt-BR"
    )} pois não foi atestada até o prazo final.`,
    userName: "Sistema (Cron Job)",
    authorId: note.userId, // CORRIGIDO: de userId para authorId para consistência
  }));

  await prisma.noteHistory.createMany({ // CORRIGIDO: de noteHistory para noteHistory
    data: historyEvents,
  });

  console.log(`[CRON] ${count} notas foram marcadas como expiradas.`);

  return { updatedCount: count };
}