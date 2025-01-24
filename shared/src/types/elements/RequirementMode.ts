/**
 * Enumerates the modes in which resource requests can be required:
 * - REQUIRE_ALL: All child items must be satisfied.
 * - REQUIRE_ANY: At least one of the child items must be satisfied.
 */
export enum RequirementMode {
    REQUIRE_ALL = "REQUIRE_ALL",
    REQUIRE_ANY = "REQUIRE_ANY",
}