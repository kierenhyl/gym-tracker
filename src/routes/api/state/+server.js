import { json } from '@sveltejs/kit';
import { isAuthenticated } from '$lib/server/auth.js';
import { getAppRow, getDb } from '$lib/server/db.js';

export async function GET({ cookies }) {
	if (!isAuthenticated(cookies)) return json({ error: 'Unauthorized' }, { status: 401 });
	const row = await getAppRow();
	if (!row) return json({ error: 'Database is not initialized.' }, { status: 503 });
	return json({ data: row.data, version: Number(row.version), updatedAt: row.updated_at });
}

export async function PUT({ request, cookies }) {
	if (!isAuthenticated(cookies)) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json();
	if (!body?.data || !Number.isInteger(body.expectedVersion)) {
		return json({ error: 'Invalid state payload.' }, { status: 400 });
	}

	const serialized = JSON.stringify(body.data);
	if (serialized.length > 5_000_000) return json({ error: 'State is too large.' }, { status: 413 });

	const sql = getDb();
	const rows = await sql`
		update gym_app_state
		set data = ${serialized}::jsonb, version = version + 1, updated_at = now()
		where id = 1 and version = ${body.expectedVersion}
		returning version, updated_at
	`;

	if (rows.length !== 1) {
		return json({ error: 'Cloud data changed in another tab or device.' }, { status: 409 });
	}

	return json({ version: Number(rows[0].version), updatedAt: rows[0].updated_at });
}
