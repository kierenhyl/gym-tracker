import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createPasswordHash, setSessionCookie } from '$lib/server/auth.js';
import { getAppRow, getDb } from '$lib/server/db.js';

export async function GET() {
	const row = await getAppRow();
	return json({ needsSetup: !row?.password_hash });
}

export async function POST({ request, cookies }) {
	if (env.VERCEL_ENV === 'production') {
		return json({ error: 'Initial setup is only available from a protected preview.' }, { status: 403 });
	}

	const row = await getAppRow();
	if (!row) return json({ error: 'Database is not initialized.' }, { status: 503 });
	if (row.password_hash) return json({ error: 'Setup has already been completed.' }, { status: 409 });

	const { password } = await request.json();
	if (typeof password !== 'string' || password.length < 12) {
		return json({ error: 'Use at least 12 characters.' }, { status: 400 });
	}

	const { salt, hash } = createPasswordHash(password);
	const sql = getDb();
	const result = await sql`
		update gym_app_state
		set password_salt = ${salt}, password_hash = ${hash}, updated_at = now()
		where id = 1 and password_hash is null
		returning id
	`;

	if (result.length !== 1) return json({ error: 'Setup has already been completed.' }, { status: 409 });
	setSessionCookie(cookies);
	return json({ ok: true });
}
