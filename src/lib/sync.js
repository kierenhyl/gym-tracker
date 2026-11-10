// Pure helpers for cloud sync. No Svelte or browser imports, so
// scripts/verify-sync.js can check them from Node.

// Structural equality that ignores object key order. Postgres stores state as
// jsonb, which reorders keys, so the data a GET returns never matches the
// string we sent even when it is the same data.
export function deepEqual(a, b) {
	if (a === b) return true;
	if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
		return Number.isNaN(a) && Number.isNaN(b);
	}
	if (Array.isArray(a) !== Array.isArray(b)) return false;
	if (Array.isArray(a)) {
		if (a.length !== b.length) return false;
		return a.every((item, i) => deepEqual(item, b[i]));
	}
	// JSON drops keys whose value is undefined, so ignore them here too.
	const keysA = Object.keys(a).filter((k) => a[k] !== undefined);
	const keysB = Object.keys(b).filter((k) => b[k] !== undefined);
	if (keysA.length !== keysB.length) return false;
	return keysA.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]));
}

// JSON with object keys sorted at every level, so equal data gives an equal
// string whatever order its keys were in.
export function canonicalJSON(value) {
	return JSON.stringify(value, (_key, v) =>
		v && typeof v === 'object' && !Array.isArray(v)
			? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]]))
			: v
	);
}

// A short hash of the data, small enough to keep several in localStorage.
// cyrb53: a fast 53-bit string hash. Not cryptographic; it only has to tell
// our own snapshots apart.
export function fingerprint(value) {
	const str = canonicalJSON(value) ?? '';
	let h1 = 0xdeadbeef;
	let h2 = 0x41c6ce57;
	for (let i = 0; i < str.length; i++) {
		const ch = str.charCodeAt(i);
		h1 = Math.imul(h1 ^ ch, 2654435761);
		h2 = Math.imul(h2 ^ ch, 1597334677);
	}
	h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
	h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
	return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

// A local copy of unsaved state, written on every change and cleared once a
// save is confirmed. On load, decide what to do with one that is still there.
//   mirror: { data, baseVersion, changedAt, sent }
//     baseVersion: the cloud version the edits were made on top of
//     changedAt:   ISO time of the last change
//     sent:        fingerprints of snapshots sent with no confirmed reply
//   cloud:  { data, version, updatedAt }
// Returns 'restore' when the local copy holds changes newer than the cloud,
// otherwise 'discard'.
export function shouldOfferRestore(mirror, cloud) {
	if (!mirror || typeof mirror !== 'object' || !mirror.data) return 'discard';
	// The save landed and only the clear was missed (a lost response).
	if (deepEqual(mirror.data, cloud?.data)) return 'discard';
	// Nothing has been saved to the cloud since these edits began.
	if (Number.isInteger(mirror.baseVersion) && mirror.baseVersion >= Number(cloud?.version)) {
		return 'restore';
	}
	// The cloud moved on, but only by a save from this device whose reply was
	// lost. The local copy came after it.
	if (Array.isArray(mirror.sent) && mirror.sent.includes(fingerprint(cloud?.data))) {
		return 'restore';
	}
	// The cloud moved on; the local copy wins only if it was written later.
	const local = Date.parse(mirror.changedAt);
	const remote = Date.parse(cloud?.updatedAt);
	if (Number.isFinite(local) && (!Number.isFinite(remote) || local > remote)) return 'restore';
	return 'discard';
}
