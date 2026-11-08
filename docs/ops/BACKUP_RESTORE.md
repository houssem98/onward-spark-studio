# Backup and restore

How BankIntelli's Postgres database on Supabase is backed up, how it is restored into an empty project, and how long backups are kept. Written for whoever operates the project. Storage objects and edge functions are not used yet, so nothing here covers them.

## What exists today

- One project, `bankintelli-test` (ref `ftqaelgrqcnbihfwdgqb`), on Supabase's free plan. It holds synthetic data only. Supabase takes no automatic backups of free-plan projects; it backs up Pro, Team and Enterprise projects daily.
- No production project yet.

## What a backup is made of

- **Schema:** the migrations in `supabase/migrations/`, kept in git. Rebuilding a database from them is tested on every gate run (`src/test/migrations.test.ts#every migration and the seed apply cleanly to an empty database`).
- **Data:** a data-only dump of the database, `auth.users` included.
- **Not in any dump:** project settings kept in the Supabase dashboard: API keys and JWT secret, sign-up and leaked-password settings, auth providers, email (SMTP). Record them when they change and set them again by hand after a restore.

## Retention policy

Decided by the product owner on 2026-11-08.

- **Test project:** no backups. Its data is synthetic and is rebuilt from the migrations and `supabase/seed.sql`.
- **Production, once it exists on the Pro plan or higher:** Supabase's daily backups, which the platform keeps for 7 days, plus a weekly data dump kept for 90 days off-site.
- **Audit events:** retention is not decided. The bank's compliance owner sets it before go-live. Until then nothing deletes an audit event: the database refuses every update, delete and truncate of one, its owner included (`src/test/migrations.test.ts#audit events stay append-only, even for the database's owner`).
- **Point-in-time recovery:** not enabled. It is a paid add-on; decide before go-live whether a day of possible loss between daily backups is acceptable.

## Back up (weekly, production)

Needs the Supabase CLI, Docker, and the database password from the dashboard. The password never goes into the repository, a log or a ticket.

```bash
supabase db dump --db-url "$DB_URL" -f data.sql --use-copy --data-only
```

Store `data.sql` off-site with the date in its name, and delete dumps older than 90 days.

## Restore into an empty project

1. Create a new Supabase project.
2. Rebuild the schema from git: `supabase link --project-ref <new ref>`, then `supabase db push`.
3. Load the data with triggers off, in one transaction:

   ```bash
   psql --single-transaction --variable ON_ERROR_STOP=1 \
     --command 'SET session_replication_role = replica' \
     --file data.sql \
     --dbname "$NEW_DB_URL"
   ```

   Triggers must be off: the audit triggers would otherwise write a second event for every restored record. The restore test fails when this line is left out.
4. Check: compare row counts per table with the source, and sign in as a known user.
5. Set the dashboard settings listed above again, and give the new project URL and publishable key to the app's `.env`.

## How the restore is tested

On every gate run, `src/test/restore.test.ts#a data dump restores into an empty database rebuilt from the migrations, row for row` follows the procedure end to end. It fills a database built from the migrations and the seed with users, an investigation, a submission and an approval. It dumps the data with pg_dump, rebuilds an empty database from the migrations alone, and loads the dump with `session_replication_role = replica`. It then compares every table row for row and checks that audit events are still append-only.

It differs from a real restore in two ways. The test database is PGlite, Postgres compiled to WebAssembly, with stand-ins for Supabase's `auth` schema (`src/test/db.ts#Supabase provides these; an empty Postgres does not.`). The dump uses `--inserts` instead of `--use-copy`, because PGlite cannot read `COPY` data from a script. A restore of a real Supabase backup into a real project is the operator's drill, due once a production project exists.
