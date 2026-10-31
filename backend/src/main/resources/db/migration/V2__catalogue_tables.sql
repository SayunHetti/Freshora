create extension if not exists btree_gist;

-- keeps updated_at current on every edit
create function set_updated_at() returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create table items (
    id          bigint generated always as identity primary key,
    name        varchar(100) not null unique,
    category    varchar(20)  not null,              -- FRUIT / VEGETABLE (checked in Java)
    unit        varchar(20)  not null default 'kg',
    active      boolean      not null default true,
    notes       text,
    created_at  timestamptz  not null default now(),
    updated_at  timestamptz  not null default now()
);

create table hotels (
    id              bigint generated always as identity primary key,
    name            varchar(150) not null unique,
    contact_person  varchar(100),
    phone           varchar(30),
    address         text,
    credit_limit    numeric(12,2) not null default 0 check (credit_limit >= 0),
    payment_terms   varchar(100),
    active          boolean      not null default true,
    notes           text,
    created_at      timestamptz  not null default now(),
    updated_at      timestamptz  not null default now()
);

create table hotel_item_prices (
    id          bigint generated always as identity primary key,
    hotel_id    bigint        not null references hotels(id),
    item_id     bigint        not null references items(id),
    price       numeric(12,2) not null check (price >= 0),
    valid_from  date          not null,
    valid_to    date,                               -- empty = until changed
    notes       text,
    created_at  timestamptz   not null default now(),
    updated_at  timestamptz   not null default now(),
    check (valid_to is null or valid_to >= valid_from),
    exclude using gist (
        hotel_id with =,
        item_id  with =,
        daterange(valid_from, valid_to, '[]') with &&
    )
);
create index idx_prices_lookup on hotel_item_prices (hotel_id, item_id, valid_from);

create table suppliers (
    id            bigint generated always as identity primary key,
    name          varchar(150) not null unique,
    phone         varchar(30),
    address       text,
    credit_limit  numeric(12,2) not null default 0 check (credit_limit >= 0),
    active        boolean      not null default true,
    notes         text,
    created_at    timestamptz  not null default now(),
    updated_at    timestamptz  not null default now()
);

create table buyers (
    id                bigint generated always as identity primary key,
    name              varchar(100) not null,
    type              varchar(20)  not null,        -- VEGETABLE / FRUIT (checked in Java)
    daily_cash_limit  numeric(12,2) check (daily_cash_limit is null or daily_cash_limit >= 0),
    active            boolean      not null default true,
    notes             text,
    created_at        timestamptz  not null default now(),
    updated_at        timestamptz  not null default now()
);

create table orders (
    id             bigint generated always as identity primary key,
    hotel_id       bigint       not null references hotels(id),
    order_date     date         not null default current_date,
    delivery_date  date         not null,
    status         varchar(20)  not null default 'RECEIVED',
    notes          text,
    created_at     timestamptz  not null default now(),
    updated_at     timestamptz  not null default now()
);
create index idx_orders_delivery on orders (delivery_date, status);
create index idx_orders_hotel on orders (hotel_id);

create table order_items (
    id                  bigint generated always as identity primary key,
    order_id            bigint        not null references orders(id) on delete cascade,
    item_id             bigint        not null references items(id),
    quantity            numeric(12,3) not null check (quantity > 0),
    delivered_quantity  numeric(12,3) check (delivered_quantity is null or delivered_quantity >= 0),
    notes               text,
    created_at          timestamptz   not null default now(),
    updated_at          timestamptz   not null default now(),
    unique (order_id, item_id)
);

-- attach the updated_at trigger to every table
create trigger trg_items_updated    before update on items             for each row execute function set_updated_at();
create trigger trg_hotels_updated   before update on hotels            for each row execute function set_updated_at();
create trigger trg_prices_updated   before update on hotel_item_prices for each row execute function set_updated_at();
create trigger trg_suppliers_updated before update on suppliers        for each row execute function set_updated_at();
create trigger trg_buyers_updated   before update on buyers            for each row execute function set_updated_at();
create trigger trg_orders_updated   before update on orders            for each row execute function set_updated_at();
create trigger trg_oitems_updated   before update on order_items       for each row execute function set_updated_at();