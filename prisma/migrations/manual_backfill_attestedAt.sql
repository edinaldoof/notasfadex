WITH first_attest AS (
  SELECT "fiscalNoteId",
         MIN("date") AS first_date,
         (ARRAY_AGG("userId" ORDER BY "date" ASC))[1] AS first_user
  FROM "NoteHistoryEvent"
  WHERE "type" = ''ATTESTED''
  GROUP BY 1
)
UPDATE "FiscalNote" f
SET "attestedAt"   = COALESCE(f."attestedAt", fa.first_date),
    "attestedById" = COALESCE(f."attestedById", fa.first_user)
FROM first_attest fa
WHERE f."id" = fa."fiscalNoteId";