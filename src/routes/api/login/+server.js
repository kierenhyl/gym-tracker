import { json } from '@sveltejs/kit';
import { setSessionCookie, verifyPassword } from '$lib/server/auth.js';
import { getAppRow } from '$lib/server/db.js';

export async function POST({ request, cookies }) {
	const { password } = await request.json();
	const row = await getAppRow();

	if (!row?.password_hash) return json({ error: 'Initial setup is not complete.' }, { status: 409 });
	if (typeof password !== 'string' || !verifyPassword(password, row.password_salt, row.password_hash)) {
		await new Promise((resolve) => setTimeout(resolve, 350));
		return json({ error: 'Incorrect password.' }, { status: 401 });
	}

	setSessionCookie(cookies);
	return json({ ok: true });
}
