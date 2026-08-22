import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
	throw new Error('DATABASE_URL is not configured. Run `vercel env pull .env.local --yes`.');
}

const sql = neon(connectionString);

await sql`
	create table if not exists gym_app_state (
		id smallint primary key check (id = 1),
		data jsonb not null,
		version bigint not null default 1,
		password_salt text,
		password_hash text,
		created_at timestamptz not null default now(),
		updated_at timestamptz not null default now()
	)
`;

await sql`
	insert into gym_app_state (id, data)
	values (
		1,
		${JSON.stringify({
			currentDayIndex: 0,
			workoutLog: [],
			completionLog: [],
			activeSession: null,
			sessionHistory: [],
			migration: null
		})}::jsonb
	)
	on conflict (id) do nothing
`;

console.log('Database migration complete.');
