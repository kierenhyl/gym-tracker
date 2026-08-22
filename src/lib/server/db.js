import { neon } from '@neondatabase/serverless';
import { env } from '$env/dynamic/private';

let client;

export function getDb() {
	if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
	if (!client) client = neon(env.DATABASE_URL);
	return client;
}

export async function getAppRow() {
	const sql = getDb();
	const rows = await sql`
		select data, version, password_salt, password_hash, updated_at
		from gym_app_state
		where id = 1
	`;
	return rows[0] ?? null;
}
