import prisma from "@/lib/prisma";
import { InvoiceStatus, HistoryType } from "@prisma/client";

/**
 * Processes expired fiscal notes.
 * Finds all pending notes past their attestation deadline,
 * updates their status to EXPIRED, and logs a history event.
 *
 * @returns An object with the count of updated notes.
 */
export async function processExpiredNotes(): Promise<{ updatedCount: number }> {
  const now = new Date();

  const expiredNotes = await prisma.fiscalNote.findMany({
    where: {
      status: InvoiceStatus.PENDENTE,
      attestationDeadline: {
        lt: now,
      },
    },
  });

  if (expiredNotes.length === 0) {
    return { updatedCount: 0 };
  }

  const expiredNoteIds = expiredNotes.map((note) => note.id);

  const { count } = await prisma.fiscalNote.updateMany({
    where: {
      id: {
        in: expiredNoteIds,
      },
    },
    data: {
      status: InvoiceStatus.EXPIRADA,
    },
  });

  const historyEvents = expiredNotes.map((note) => ({
    fiscalNoteId: note.id,
    type: HistoryType.EXPIRED,
    details: `A nota expirou em ${now.toLocaleDateString(
      "pt-BR"
    )} pois não foi atestada até o prazo final.`,
    userName: "Sistema (Cron Job)",
    userId: note.userId,
  }));

  await prisma.noteHistoryEvent.createMany({
    data: historyEvents,
  });

  console.log(`[CRON] ${count} notas foram marcadas como expiradas.`);

  return { updatedCount: count };
}