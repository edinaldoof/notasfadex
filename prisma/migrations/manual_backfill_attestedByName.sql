UPDATE "FiscalNote"
SET "attestedByName" = COALESCE("attestedByName", "attestedBy")
WHERE "attestedBy" IS NOT NULL;