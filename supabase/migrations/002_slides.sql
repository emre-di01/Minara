alter table playlists
  add column if not exists mode  text not null default 'widgets' check (mode in ('widgets', 'slides')),
  add column if not exists slides jsonb not null default '[]';
