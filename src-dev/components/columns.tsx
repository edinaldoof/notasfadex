// src/components/columns.tsx

// CORREÇÃO: "use client" deve ser a primeira linha do arquivo, sem nada antes.
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"
import { Note } from "@prisma/client" // Importa o tipo da sua nota do Prisma

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Função para formatar moeda
const formatCurrency = (amount: number | null) => {
  if (amount === null || isNaN(amount)) {
    return "N/A";
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
}

// Função para formatar a data
const formatDate = (date: Date | null) => {
    if (!date) return "N/A";
    return new Intl.DateTimeFormat('pt-BR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    }).format(new Date(date));
}

export const columns: ColumnDef<Note>[] = [
  {
    accessorKey: "numeroNota",
    header: "Número",
  },
  {
    accessorKey: "prestadorRazaoSocial",
    header: "Prestador",
  },
  {
    accessorKey: "tomadorCnpj",
    header: "CNPJ Tomador",
  },
  {
    accessorKey: "valorTotal",
    header: "Valor Total",
    cell: ({ row }) => formatCurrency(row.original.valorTotal),
  },
  {
    accessorKey: "status",
    header: "Status",
  },
  {
    accessorKey: "createdAt",
    header: "Data de Criação",
    cell: ({ row }) => formatDate(row.original.createdAt)
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const note = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Ações</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(note.id)}
            >
              Copiar ID da Nota
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]