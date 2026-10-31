-- Ari's three hearing calibrations.
-- Keys stay hearing_a / hearing_b / hearing_c so existing rows keep their type.
-- hearing_a = טימפנומטר, 12 months
-- hearing_b = אודיומטר, 12 months
-- hearing_c = תא אקוסטי, 24 months

comment on column public.store_documents.doc_type is
  'Document kind. Hearing calibrations: hearing_a=טימפנומטר (12 months), hearing_b=אודיומטר (12 months), hearing_c=תא אקוסטי (24 months); legacy hearing=annual. Fire/electrical unchanged.';
