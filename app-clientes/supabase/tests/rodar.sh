#!/usr/bin/env bash
# Sobe um Postgres temporário, aplica as migrations e roda os testes.
set -euo pipefail
cd "$(dirname "$0")/.."
DIR=$(mktemp -d)
PG=/usr/lib/postgresql/16/bin
chown postgres "$DIR" 2>/dev/null || true
run() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
run "$PG/initdb -D $DIR -A trust -U postgres >/dev/null"
run "$PG/pg_ctl -D $DIR -o '-p 54329 -k $DIR -c timezone=UTC' -l $DIR/log -w start >/dev/null"
trap 'run "$PG/pg_ctl -D $DIR -m fast stop >/dev/null"; rm -rf "$DIR"' EXIT
P="psql -h $DIR -p 54329 -U postgres -d postgres -v ON_ERROR_STOP=1 -q"
$P -f tests/stub_supabase.sql
# todas as migrations em ordem, menos a de Storage/cron (precisa dos esquemas do Supabase)
for f in migrations/*.sql; do case "$f" in *_storage_agenda.sql) continue ;; esac; $P -f "$f"; done
$P -f seed.sql
$P -f tests/regras.test.sql 2>&1 | sed 's/^psql:[^ ]* NOTICE:  //'
