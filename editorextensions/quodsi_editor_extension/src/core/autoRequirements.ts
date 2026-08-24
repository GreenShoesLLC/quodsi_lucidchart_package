/** True when `req` is the plain auto-requirement for its own id: one request
 *  against `req.id`, default quantity, no sub-clauses. Such entries are
 *  DERIVED at build (reconcileAutoRequirements) and never stored in
 *  q_res_requirements; an override under the same id (different quantity,
 *  priority, keepResource, or extra requests) is stored. Mirrors
 *  quodsim-react's isPlainAutoRequirement (useReferenceDataAccessor.ts) --
 *  the defaults checked below (quantity 1, priority 1, keepResource false)
 *  match ResourceRequest.create's own defaults in quodsi_shared, the same
 *  defaults the panel's copy accepts as "omitted, its sparse-wire default".
 */
export function isPlainAutoRequirement(req: { id: string; rootClause?: { requests?: Array<Record<string, unknown>>; clauses?: unknown[] } }): boolean {
    const rc = req.rootClause;
    const requests = rc?.requests ?? [];
    const clauses = rc?.clauses ?? [];
    if (clauses.length !== 0 || requests.length !== 1) return false;
    const r = requests[0];
    if (String(r.resourceId) !== String(req.id)) return false;
    const q = r.quantity; const p = r.priority; const k = r.keepResource;
    return (q === undefined || q === 1) && (p === undefined || p === 1) && (k === undefined || k === false);
}
