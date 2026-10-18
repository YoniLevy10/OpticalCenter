-- C08 — Hearing calibrations ×3 (כיול א / כיול ב / כיול ג).
-- App stores these as store_documents.doc_type free-text keys:
--   hearing_a, hearing_b, hearing_c
-- Legacy key `hearing` (annual) remains valid for existing rows.
-- No structural change required; document the contract for ops + ingest.

comment on column public.store_documents.doc_type is
  'Document kind. Hearing calibrations (C08): hearing_a=כיול א, hearing_b=כיול ב, hearing_c=כיול ג; legacy hearing=annual. Fire/electrical unchanged.';
