"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AddNoteDialog } from "../add-note-dialog.jsx";
import { Button } from "../../../../components/ui/button";

export function NotasClient() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const router = useRouter();

  // Função para recarregar os dados da página após uma nota ser adicionada.
  const handleNoteAdded = () => {
    router.refresh();
  };

  return (
    <>
      <Button onClick={() => setIsDialogOpen(true)}>Adicionar Nota</Button>
      <AddNoteDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onNoteAdded={handleNoteAdded}
      />
    </>
  );
}