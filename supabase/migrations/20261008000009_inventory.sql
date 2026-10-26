-- =============================================================================
-- 09 · Inventory: stock_levels, stock_movements, stock_adjustments
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Stock Levels Cache (1:1 with product_variants)
-- Maintained strictly by trigger on stock_movements
-- -----------------------------------------------------------------------------
create table public.stock_levels (
  variant_id       uuid primary key references public.product_variants (id) on delete cascade,
  quantity_on_hand numeric(14,3) not null default 0,
  last_movement_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Stock Movements (Immutable Ledger)
-- -----------------------------------------------------------------------------
create table public.stock_movements (
  id             uuid primary key default gen_random_uuid(),
  variant_id     uuid not null references public.product_variants (id) on delete restrict,
  movement_date  date not null,
  movement_type  public.movement_type not null,
  quantity       numeric(14,3) not null check (quantity <> 0),
  unit_cost      numeric(14,4) not null default 0 check (unit_cost >= 0),
  balance_after  numeric(14,3) not null,
  source_type    text not null check (source_type in ('opening', 'purchase', 'purchase_return', 'sale', 'sales_return', 'adjustment', 'reversal')),
  source_id      uuid,
  source_line_id uuid,
  reversal_of    uuid unique references public.stock_movements (id),
  created_at     timestamptz not null default now(),
  created_by     uuid references public.profiles (id)
);

create index stock_movements_variant_idx on public.stock_movements (variant_id, movement_date, created_at);
create index stock_movements_source_idx  on public.stock_movements (source_type, source_id);

-- Immutable guard for stock movements
create trigger stock_movements_immutable
  before update or delete on public.stock_movements
  for each row execute function private.prevent_modification();

-- Trigger to maintain stock_levels cache and weighted average cost
create or replace function private.maintain_stock_levels()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_qty  numeric(14,3) := 0;
  v_current_cost numeric(14,4) := 0;
  v_new_cost     numeric(14,4);
  v_allow_neg    boolean;
begin
  select allow_negative_stock into v_allow_neg from public.settings where id = 1;

  -- Lock stock_levels row for updating
  insert into public.stock_levels (variant_id, quantity_on_hand, last_movement_at)
  values (new.variant_id, new.quantity, now())
  on conflict (variant_id) do update set
    quantity_on_hand = stock_levels.quantity_on_hand + new.quantity,
    last_movement_at = now()
  returning quantity_on_hand into v_current_qty;

  -- Block negative stock if setting disabled
  if not coalesce(v_allow_neg, false) and v_current_qty < 0 then
    perform private.raise_error('INSUFFICIENT_STOCK', jsonb_build_object(
      'variant_id', new.variant_id,
      'movement_qty', new.quantity,
      'resulting_qty', v_current_qty
    ));
  end if;

  -- Update weighted average cost on inbound purchase or opening stock
  if new.quantity > 0 and new.unit_cost > 0 and new.movement_type in ('opening_stock', 'purchase') then
    select average_cost into v_current_cost from public.variant_costs where variant_id = new.variant_id;
    v_current_cost := coalesce(v_current_cost, 0);

    -- New Average Cost = ((Old Qty * Old Cost) + (Inbound Qty * Inbound Cost)) / New Total Qty
    if v_current_qty > 0 then
      v_new_cost := (((v_current_qty - new.quantity) * v_current_cost) + (new.quantity * new.unit_cost)) / v_current_qty;
    else
      v_new_cost := new.unit_cost;
    end if;

    update public.variant_costs set
      last_purchase_rate = new.unit_cost,
      average_cost = round(v_new_cost, 4),
      updated_at = now()
    where variant_id = new.variant_id;
  end if;

  return new;
end;
$$;

create trigger stock_movements_after_insert
  after insert on public.stock_movements
  for each row execute function private.maintain_stock_levels();

-- -----------------------------------------------------------------------------
-- Stock Adjustments Document
-- -----------------------------------------------------------------------------
create table public.stock_adjustments (
  id             uuid primary key default gen_random_uuid(),
  adjustment_no  text not null unique check (adjustment_no ~ '^[A-Z0-9_-]{3,20}$'),
  adjustment_date date not null,
  reason         public.adjustment_reason not null,
  notes          text,
  status         public.doc_status not null default 'posted',
  created_at     timestamptz not null default now(),
  created_by     uuid references public.profiles (id)
);

create table public.stock_adjustment_items (
  id             uuid primary key default gen_random_uuid(),
  adjustment_id  uuid not null references public.stock_adjustments (id) on delete cascade,
  variant_id     uuid not null references public.product_variants (id) on delete restrict,
  system_qty     numeric(14,3) not null,
  counted_qty    numeric(14,3),
  qty_change     numeric(14,3) not null check (qty_change <> 0),
  unit_cost      numeric(14,4) not null default 0 check (unit_cost >= 0)
);

-- RLS
alter table public.stock_levels           enable row level security;
alter table public.stock_movements        enable row level security;
alter table public.stock_adjustments      enable row level security;
alter table public.stock_adjustment_items  enable row level security;

grant select on public.stock_levels, public.stock_movements to authenticated;
grant select on public.stock_adjustments, public.stock_adjustment_items to authenticated;

create policy stock_levels_select    on public.stock_levels for select to authenticated using ((select private.has_permission('inventory.view')));
create policy stock_movements_select on public.stock_movements for select to authenticated using ((select private.has_permission('inventory.view_movements')));
create policy adjustments_select     on public.stock_adjustments for select to authenticated using ((select private.has_permission('inventory.view')));
create policy adj_items_select       on public.stock_adjustment_items for select to authenticated using ((select private.has_permission('inventory.view')));
