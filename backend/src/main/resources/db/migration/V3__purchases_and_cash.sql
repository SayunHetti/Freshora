create table purchases (
    id              bigint generated always as identity primary key,
    buyer_id        bigint        not null references buyers(id),
    supplier_id     bigint        not null references suppliers(id),
    item_id         bigint        not null references items(id),
    purchase_date   date          not null default current_date,
    quantity        numeric(12,3) not null check (quantity > 0),
    price_per_unit  numeric(12,2) not null check (price_per_unit >= 0),
    total           numeric(14,2) not null check (total >= 0),
    payment_type    varchar(10)   not null,            -- CASH / CREDIT (checked in Java)
    notes           text,
    created_at      timestamptz   not null default now(),
    updated_at      timestamptz   not null default now()
);
create index idx_purchases_date_buyer on purchases (purchase_date, buyer_id);
create index idx_purchases_supplier on purchases (supplier_id);

create table supplier_payments (
    id            bigint generated always as identity primary key,
    supplier_id   bigint        not null references suppliers(id),
    payment_date  date          not null default current_date,
    amount        numeric(14,2) not null check (amount > 0),
    method        varchar(20)   not null,              -- CASH / BANK_TRANSFER / CHEQUE
    notes         text,
    created_at    timestamptz   not null default now(),
    updated_at    timestamptz   not null default now()
);
create index idx_supplier_payments_supplier on supplier_payments (supplier_id);

create table buyer_cash_log (
    id          bigint generated always as identity primary key,
    buyer_id    bigint        not null references buyers(id),
    log_date    date          not null default current_date,
    amount      numeric(14,2) not null check (amount > 0),
    category    varchar(20)   not null,                -- CHEQUE / BANK_WITHDRAWAL / CASH_GIVEN
    notes       text,
    created_at  timestamptz   not null default now(),
    updated_at  timestamptz   not null default now()
);
create index idx_cash_log_buyer_date on buyer_cash_log (buyer_id, log_date);

create table buyer_cash_returns (
    id           bigint generated always as identity primary key,
    buyer_id     bigint        not null references buyers(id),
    return_date  date          not null default current_date,
    amount       numeric(14,2) not null check (amount > 0),
    notes        text,
    created_at   timestamptz   not null default now(),
    updated_at   timestamptz   not null default now()
);
create index idx_cash_returns_buyer_date on buyer_cash_returns (buyer_id, return_date);

create trigger trg_purchases_updated        before update on purchases          for each row execute function set_updated_at();
create trigger trg_supplier_payments_updated before update on supplier_payments for each row execute function set_updated_at();
create trigger trg_cash_log_updated         before update on buyer_cash_log     for each row execute function set_updated_at();
create trigger trg_cash_returns_updated     before update on buyer_cash_returns for each row execute function set_updated_at();