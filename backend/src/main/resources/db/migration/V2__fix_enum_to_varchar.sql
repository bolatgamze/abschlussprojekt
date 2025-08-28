alter table ap_game_session
alter column game_type type varchar(50) using game_type::varchar;

alter table ap_game_session
alter column player_theme type varchar(50) using player_theme::varchar;

drop type if exists game_type cascade;
drop type if exists player_theme cascade;
