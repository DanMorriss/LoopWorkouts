/**
 * Where the Exercises list was opened from, by a link to exercises for a muscle on another
 * page (`?from=`): its ‹ goes back there. Only the Plan page's muscles link in this way.
 */
const LIST_FROM: Readonly<Record<string, { url: string; label: string }>> = {
    plan: { url: '/plan', label: 'Plan' },
};

/** The page the list goes back to with ‹, or null for none (it's a tab of its own). */
export function listBackLink(from: string | null): { url: string; label: string } | null {
    return (from && LIST_FROM[from]) || null;
}
