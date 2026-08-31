-- Product barcode separate from internal asset code (MediTactic-style).
alter table public.assets
  add column if not exists barcode text;

comment on column public.assets.barcode is
  'Product barcode (EAN/UPC/Code128). Distinct from internal code/serial.';

create unique index if not exists assets_store_barcode_uidx
  on public.assets (store_id, barcode)
  where barcode is not null and length(trim(barcode)) > 0;
