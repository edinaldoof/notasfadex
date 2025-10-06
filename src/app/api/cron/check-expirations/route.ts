import { NextRequest, NextResponse } from "next/server";
import { processExpiredNotes } from "../../../lib/services/notes.service";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { updatedCount } = await processExpiredNotes();

    if (updatedCount === 0) {
      return NextResponse.json({
        success: true,
        message: "Nenhuma nota expirada encontrada.",
      });
    }

    return NextResponse.json({ success: true, updatedCount });
  } catch (error) {
    console.error("[CRON] Erro ao verificar notas expiradas:", error);
    return new NextResponse("Erro interno do servidor", { status: 500 });
  }
}