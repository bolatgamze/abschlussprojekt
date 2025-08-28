-- Önce eski tabloları ve enumları kaldırıyoruz
drop table if exists ap_game_session cascade;
drop table if exists ap_user cascade;
drop type if exists game_type cascade;
drop type if exists player_theme cascade;

-- Kullanıcı tablosu
create table ap_user (
                         id uuid primary key,
                         username varchar(50) unique not null,
                         password_hash varchar(200) not null,
                         role varchar(20) not null default 'USER',
                         created_at timestamptz not null default now()
);

-- Oyun session tablosu (enum yerine varchar kullanıyoruz)
create table ap_game_session (
                                 id uuid primary key,
                                 user_id uuid null references ap_user(id) on delete set null,
                                 game_type varchar(50) not null,
                                 player_theme varchar(50) not null,
                                 started_at timestamptz not null default now(),
                                 finished_at timestamptz null,
                                 score int null,
                                 metadata jsonb null
);

-- Indexler
create index ap_gs_top_idx on ap_game_session(game_type, player_theme, score desc);
create index ap_gs_user_idx on ap_game_session(user_id, finished_at desc);
