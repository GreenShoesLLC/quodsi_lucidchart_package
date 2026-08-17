import { RequirementClause, RequirementMode, ResourceRequest } from '@quodsi/lucid-shared';

/**
 * UI structure for team-based resource requirements
 * This is the structure used by the React UI components
 */
export interface TeamStructure {
  mode: 'ALL' | 'ANY';
  teams: Array<{
    mode: 'ALL' | 'ANY';
    requests: Array<{
      resourceId: string;
      quantity: number;
    }>;
  }>;
}

/**
 * Convert UI team structure to a single root RequirementClause for backend.
 *
 * Wire-cleanup Phase B2 Task 6/10: `ResourceRequirement.rootClauses[]`
 * collapsed to a single required `rootClause` — the clean engine schema
 * structurally enforces "exactly one root clause". `RequirementClause`'s
 * constructor dropped `parentClauseId` (round-trip-only bookkeeping, no
 * clean-wire slot; tree structure comes entirely from nesting under
 * `clauses`) and renamed `subClauses` -> `clauses`.
 */
export function convertStructureToRootClauses(structure: TeamStructure): RequirementClause {
  // Handle simple case: single team with ALL mode at root
  if (structure.mode === 'ALL' && structure.teams.length === 1) {
    const team = structure.teams[0];
    const requests = team.requests.map(r => new ResourceRequest(r.resourceId, r.quantity));

    // If team also uses ALL mode and has no subclauses, create simple root clause
    if (team.mode === 'ALL') {
      return new RequirementClause(
        'root-clause',
        RequirementMode.REQUIRE_ALL,
        requests,
        []
      );
    }

    // Team uses ANY mode - need subclause structure
    const rootClause = new RequirementClause(
      'root-clause',
      RequirementMode.REQUIRE_ALL,
      [],
      []
    );

    const subClause = new RequirementClause(
      'sub-clause-0',
      RequirementMode.REQUIRE_ANY,
      requests,
      []
    );

    rootClause.addSubClause(subClause);
    return rootClause;
  }

  // Complex case: multiple teams or ANY mode at top level
  const rootMode = structure.mode === 'ALL' ? RequirementMode.REQUIRE_ALL : RequirementMode.REQUIRE_ANY;
  const rootClause = new RequirementClause(
    'root-clause',
    rootMode,
    [],
    []
  );

  structure.teams.forEach((team, idx) => {
    const teamMode = team.mode === 'ALL' ? RequirementMode.REQUIRE_ALL : RequirementMode.REQUIRE_ANY;
    const requests = team.requests.map(r => new ResourceRequest(r.resourceId, r.quantity));

    const subClause = new RequirementClause(
      `sub-clause-${idx}`,
      teamMode,
      requests,
      []
    );

    rootClause.addSubClause(subClause);
  });

  return rootClause;
}

/**
 * Convert a single root RequirementClause from backend to UI team structure.
 */
export function convertRootClausesToStructure(rootClause: RequirementClause | undefined | null): TeamStructure {
  if (!rootClause) {
    return {
      mode: 'ANY',
      teams: []
    };
  }

  // Simple case: root clause has only requests, no subclauses
  if (rootClause.requests.length > 0 && rootClause.clauses.length === 0) {
    return {
      mode: rootClause.mode === RequirementMode.REQUIRE_ALL ? 'ALL' : 'ANY',
      teams: [{
        mode: rootClause.mode === RequirementMode.REQUIRE_ALL ? 'ALL' : 'ANY',
        requests: rootClause.requests.map(req => ({
          resourceId: req.resourceId,
          quantity: req.quantity
        }))
      }]
    };
  }

  // Case: root clause with only subclauses (no direct requests)
  if (rootClause.requests.length === 0 && rootClause.clauses.length > 0) {
    return {
      mode: rootClause.mode === RequirementMode.REQUIRE_ALL ? 'ALL' : 'ANY',
      teams: rootClause.clauses.map(subClause => ({
        mode: subClause.mode === RequirementMode.REQUIRE_ALL ? 'ALL' : 'ANY',
        requests: subClause.requests.map(req => ({
          resourceId: req.resourceId,
          quantity: req.quantity
        }))
      }))
    };
  }

  // Complex case: root clause has both requests and subclauses
  // Convert root requests to a team, then add subclauses as additional teams
  const teams: TeamStructure['teams'] = [];

  if (rootClause.requests.length > 0) {
    teams.push({
      mode: rootClause.mode === RequirementMode.REQUIRE_ALL ? 'ALL' : 'ANY',
      requests: rootClause.requests.map(req => ({
        resourceId: req.resourceId,
        quantity: req.quantity
      }))
    });
  }

  rootClause.clauses.forEach(subClause => {
    teams.push({
      mode: subClause.mode === RequirementMode.REQUIRE_ALL ? 'ALL' : 'ANY',
      requests: subClause.requests.map(req => ({
        resourceId: req.resourceId,
        quantity: req.quantity
      }))
    });
  });

  return {
    mode: rootClause.mode === RequirementMode.REQUIRE_ALL ? 'ALL' : 'ANY',
    teams
  };
}

/**
 * Generate a human-readable preview of a team structure
 */
export function generatePreview(structure: TeamStructure, getResourceName: (id: string) => string): string {
  const teamDescriptions = structure.teams.map(team => {
    const resourceParts = team.requests.map(req =>
      `${req.quantity} ${getResourceName(req.resourceId)}`
    );

    if (resourceParts.length === 1) {
      return resourceParts[0];
    }

    const teamConnector = team.mode === 'ANY' ? ' OR ' : ' + ';
    return `(${resourceParts.join(teamConnector)})`;
  });

  const connector = structure.mode === 'ANY' ? ' OR ' : ' AND ';
  return teamDescriptions.join(connector) || 'No teams defined';
}
