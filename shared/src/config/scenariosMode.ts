/**
 * Global rollout switch for the embedded Studio scenarios editor.
 * true  = DB-authoritative: quodsim-react shows the Scenarios button (embed),
 *         and the extension's shapeData->DB scenario syncs guarded-seed only
 *         (push when the DB is empty; never replace-all), so embed-created DB
 *         scenarios are never clobbered.
 * false = legacy: quodsim-react shows the Scenarios tab; extension keeps the
 *         existing shapeData-authoritative replace-all syncs.
 * Flip + rebuild to roll out; rollback = redeploy the prior build.
 */
export const SCENARIOS_DB_AUTHORITATIVE = false;
