import React, { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ExternalLink,
  LogOut,
  User,
} from "lucide-react";
import { useAuth, useEntitlements } from "../../messaging/MessageContext";
import { useAuthSender } from "../../messaging/senders/authSender";
import { usePortalSender } from "../../messaging/senders/portalSender";
import { useUpgradeInterestSender } from "../../messaging/senders/upgradeInterestSender";
import {
  planDisplayLabel,
  simulationsRemaining,
  simulationsUsage,
  trialDaysRemaining,
} from "../../messaging/state/entitlementsSlice";

const DEFAULT_SALES_EMAIL = "sales@quodsi.com";
const COPIED_RESET_MS = 1500;

type Tone = "danger" | "warning" | "info" | "neutral";

const TONE_CLASSES: Record<Tone, string> = {
  danger: "bg-red-50 text-red-700 border-red-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
  neutral: "bg-gray-50 text-gray-600 border-gray-200",
};

function formatUsage(used: number, limit: number | null): string {
  return limit === null ? "Unlimited" : `${used} of ${limit}`;
}

function formatLimit(limit: number | null): string {
  return limit === null ? "Unlimited" : `${limit}`;
}

// Ported from Studio's PlanBadge / drawio's PlanChip so all three surfaces
// agree on what counts as "exhausted" / "near limit" for a metered quota.
function isQuotaExhausted(used: number, limit: number | null): boolean {
  return limit !== null && used >= limit;
}

function isQuotaNearLimit(used: number, limit: number | null): boolean {
  return limit !== null && limit > 0 && used / limit >= 0.8;
}

/**
 * Plan visibility chip. Inert — plan name only, no click handler, no usage
 * numbers, no tooltip beyond `Plan: <label>`. Preserves the existing
 * label/tone behavior (built from `simulationsRemaining` — the ≤2-remaining
 * "low" threshold is intentionally NOT changed here). The fuller entitlements
 * breakdown lives one step deeper, in `PlanDetails`, behind the account
 * menu's "Plan details" disclosure.
 */
const PlanBadge: React.FC = () => {
  const auth = useAuth();
  const entitlements = useEntitlements();

  // Fail-closed on purpose (unlike AuthStatusIndicator's Upgrade menu item):
  // nothing billing-related may render before entitlements have loaded, and
  // upgradeAvailable === false means billing is dark for this environment.
  if (!auth.isAuthenticated || !entitlements.loaded || entitlements.upgradeAvailable === false) {
    return null;
  }

  const label = planDisplayLabel(entitlements);
  const trialDays = trialDaysRemaining(entitlements);
  const remaining = simulationsRemaining(entitlements);

  const isTrial = trialDays !== null;

  const studiesUsed = entitlements.studiesUsed;
  const studiesLimit = entitlements.studiesPerOrgLimit;
  const studiesExhausted = studiesUsed !== null && isQuotaExhausted(studiesUsed, studiesLimit);
  const studiesNear = studiesUsed !== null && isQuotaNearLimit(studiesUsed, studiesLimit);

  const isExhausted = (remaining !== null && remaining <= 0) || studiesExhausted;
  const isLow =
    !isExhausted && ((remaining !== null && remaining > 0 && remaining <= 2) || studiesNear);

  // No explicit `planKey === 'quodsi_employee' → neutral` branch: Studio's
  // ported priority order falls through to "neutral" by default whenever
  // nothing is exhausted/near/trialing, which is exactly what an employee
  // plan (never trialing, never metered near a limit) already gets here.
  const tone: Tone = isExhausted ? "danger" : isLow ? "warning" : isTrial ? "info" : "neutral";

  const title = `Plan: ${label}`;

  return (
    <span
      className={`inline-block px-2 py-0.5 text-[10px] font-medium rounded border ${TONE_CLASSES[tone]}`}
      title={title}
    >
      {label}
    </span>
  );
};

/**
 * The entitlement/usage body, moved verbatim out of PlanBadge's old dropdown.
 * Rendered only when AuthStatusIndicator's "Plan details" disclosure is
 * expanded — usage is deliberately two clicks deep.
 *
 * Row visibility for the three study-keyed *limit* rows (Studies, Scenarios
 * per study, Replications per run) is gated on `planSource !== null` rather
 * than each field's own null-check: `planSource` is the one new field whose
 * null can ONLY mean "old host never sent Task 7's fields" (there's no
 * legitimate domain value of "no plan source"), whereas a bare
 * `scenariosPerStudyLimit === null` is ambiguous — it could mean "old host"
 * OR "new host explicitly saying this plan has no limit" (unlimited).
 * `tradeoffAnalysis` doesn't have this ambiguity, so it keeps its own check.
 */
const PlanDetails: React.FC = () => {
  const auth = useAuth();
  const entitlements = useEntitlements();
  const { pingUpgradeInterest } = useUpgradeInterestSender();
  const [copied, setCopied] = useState(false);
  const addressRef = useRef<HTMLSpanElement>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  // Same fail-closed rule as PlanBadge.
  if (!auth.isAuthenticated || !entitlements.loaded || entitlements.upgradeAvailable === false) {
    return null;
  }

  const label = planDisplayLabel(entitlements);
  const trialDays = trialDaysRemaining(entitlements);
  const runsUsage = simulationsUsage(entitlements);
  const studiesUsed = entitlements.studiesUsed;
  const studiesLimit = entitlements.studiesPerOrgLimit;

  const salesEmail = auth.config?.salesEmail || DEFAULT_SALES_EMAIL;
  const mailtoHref = `mailto:${salesEmail}?subject=${encodeURIComponent("Quodsi plan upgrade")}`;

  // Fire-and-forget: never blocks the mailto navigation or the copy action,
  // never surfaces an error to the user — it's a courtesy signal.
  const pingInterest = () => {
    pingUpgradeInterest("upgrade").catch(() => {});
  };

  const handleCopyEmail = async () => {
    let copySucceeded = true;
    try {
      await navigator.clipboard.writeText(salesEmail);
    } catch {
      copySucceeded = false;
    }
    pingInterest();
    if (!copySucceeded) {
      // Don't claim "Copied" when nothing was copied — select the address
      // so a manual Ctrl/Cmd-C works instead.
      const node = addressRef.current;
      const sel = typeof window.getSelection === "function" ? window.getSelection() : null;
      if (node && sel) {
        const range = document.createRange();
        range.selectNodeContents(node);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      return;
    }
    setCopied(true);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);
  };

  return (
    <div className="border-t border-gray-100 text-xs">
      <div className="px-3 py-2 space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-gray-500">Plan</span>
          <span className="text-gray-700">
            {label} ({entitlements.planStatus})
          </span>
        </div>
        {trialDays !== null && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-500">Trial</span>
            <span className="text-gray-700">
              {trialDays} day{trialDays === 1 ? "" : "s"} left
            </span>
          </div>
        )}
        {entitlements.planSource === "free_fallback" && (
          <p className="text-[11px] text-amber-700">
            No plan assigned — using default Free limits
          </p>
        )}
        {runsUsage && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-500">Runs this month</span>
            <span className="text-gray-700">{formatUsage(runsUsage.used, runsUsage.limit)}</span>
          </div>
        )}
        {entitlements.planSource !== null && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-500">Studies</span>
            <span className="text-gray-700">{formatUsage(studiesUsed ?? 0, studiesLimit)}</span>
          </div>
        )}
        {entitlements.planSource !== null && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-500">Scenarios per study</span>
            <span className="text-gray-700">{formatLimit(entitlements.scenariosPerStudyLimit)}</span>
          </div>
        )}
        {entitlements.planSource !== null && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-500">Replications per run</span>
            <span className="text-gray-700">
              {formatLimit(entitlements.replicationsPerScenarioLimit)}
            </span>
          </div>
        )}
        {entitlements.tradeoffAnalysis !== null && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-500">Tradeoff Analysis</span>
            <span className="text-gray-700">{entitlements.tradeoffAnalysis ? "✓" : "✗"}</span>
          </div>
        )}
      </div>
      {/* Contact-to-upgrade affordance only makes sense for the free plan,
          gated on the CURRENT plan code 'quodsi_free' only (not the legacy
          'quodsi_free_user' code). Paying plans already have the "Upgrade
          plan" Kinde-portal item below. */}
      {entitlements.planKey === "quodsi_free" && (
        <div className="border-t border-gray-100">
          <a
            href={mailtoHref}
            onClick={pingInterest}
            className="block px-3 py-2 text-blue-700 hover:bg-blue-50"
          >
            Contact us to upgrade
          </a>
          <div className="flex items-center gap-2 px-3 pb-2 text-gray-600">
            <span className="select-all" ref={addressRef}>
              {salesEmail}
            </span>
            <button
              type="button"
              onClick={handleCopyEmail}
              className="rounded border border-gray-200 px-1.5 py-0.5 text-[11px] text-gray-600 hover:bg-gray-100"
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const AuthStatusIndicator: React.FC = () => {
  const auth = useAuth();
  const entitlements = useEntitlements();
  const authSender = useAuthSender();
  const { requestPortalUrl } = usePortalSender();
  const [authDropdownOpen, setAuthDropdownOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [requestingUpgrade, setRequestingUpgrade] = useState(false);
  const authDropdownRef = useRef<HTMLDivElement>(null);

  // upgradeAvailable: false = billing off → hide; null/true = show (fail-open — do NOT change to === true)
  const showUpgrade = auth.isAuthenticated && entitlements.loaded && entitlements.upgradeAvailable !== false;

  const handleUpgrade = async () => {
    if (requestingUpgrade) return;
    setAuthDropdownOpen(false);
    setRequestingUpgrade(true);
    try {
      const url = await requestPortalUrl(
        "organization_plan_details",
        "https://lucid.app",
      );
      window.open(url, "_blank", "noopener");
    } catch (err) {
      console.error("portal_url_request_failed", err);
    } finally {
      setRequestingUpgrade(false);
    }
  };

  const handleSignOut = () => {
    setAuthDropdownOpen(false);
    // Lucid's sign-out opens Kinde's logout URL in a new tab and then calls
    // authSender.logout(), which clears state in place — there is no
    // redirect/remount here (unlike Studio's Kinde-hosted logout flow), so a
    // stale expanded disclosure would otherwise survive into the next
    // sign-in. Usage must always start collapsed.
    setDetailsOpen(false);
    // Open Kinde's logout URL in a new tab as defense-in-depth: it kills
    // Kinde's SSO session cookie cleanly. With prompt=login on the kinde
    // provider's authorizationUrl in the manifest, the next "Sign In"
    // click will force a credentials prompt regardless of session cookie
    // state, so this step is no longer load-bearing — but kept so the
    // user is fully signed out of Kinde, not just out of Quodsi.
    const issuer = auth.user?.kindeIssuer;
    if (issuer) {
      window.open(`${issuer.replace(/\/$/, "")}/logout`, "_blank", "noopener");
    } else {
      console.warn("Sign Out: no kindeIssuer in user info; skipping Kinde logout step");
    }
    // Extension-side handler clears local state, broadcasts AUTH_STATUS(false),
    // then calls client.revokeOAuthToken('kinde'). See authHandler.handleLogout.
    authSender.logout();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        authDropdownRef.current &&
        !authDropdownRef.current.contains(event.target as Node)
      ) {
        setAuthDropdownOpen(false);
        setDetailsOpen(false);
      }
    };
    if (authDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [authDropdownOpen]);

  if (!auth.isAuthenticated) {
    return (
      <div className="relative" ref={authDropdownRef}>
        <button
          onClick={() => setAuthDropdownOpen(!authDropdownOpen)}
          className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
        >
          <User className="w-3 h-3" />
          Sign In
          <ChevronDown className="w-3 h-3" />
        </button>
        {authDropdownOpen && (
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 min-w-[180px]">
            <button
              onClick={() => {
                setAuthDropdownOpen(false);
                authSender.requestAuth();
              }}
              className="w-full px-3 py-2 text-left text-xs text-blue-700 hover:text-blue-900 hover:bg-blue-50 flex items-center gap-2"
              title="Sign in to your existing Quodsi account"
            >
              <User className="w-3 h-3" />
              Sign in
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={authDropdownRef}>
      <button
        onClick={() => setAuthDropdownOpen(!authDropdownOpen)}
        className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors max-w-[200px]"
        title={auth.user?.email || "Signed in"}
      >
        <User className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">
          {auth.user?.displayName || auth.user?.email || "Signed in"}
        </span>
      </button>
      {authDropdownOpen && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 min-w-[220px]">
          {auth.user?.email && (
            <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100 truncate">
              {auth.user.email}
            </div>
          )}
          <button
            type="button"
            onClick={() => setDetailsOpen(!detailsOpen)}
            aria-expanded={detailsOpen}
            className="w-full px-3 py-2 text-left text-xs hover:bg-gray-100 flex items-center justify-between gap-2"
          >
            <span>Plan details</span>
            <span aria-hidden="true">{detailsOpen ? "▾" : "▸"}</span>
          </button>
          {detailsOpen && <PlanDetails />}
          {showUpgrade && (
            <button
              onClick={handleUpgrade}
              disabled={requestingUpgrade}
              className="w-full px-3 py-2 text-left text-xs text-blue-700 hover:text-blue-900 hover:bg-blue-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-wait"
              title="Pick or change your Quodsi plan (opens in a new tab)"
            >
              <ExternalLink className="w-3 h-3" />
              {requestingUpgrade ? "Loading…" : "Upgrade plan"}
            </button>
          )}
          <button
            onClick={handleSignOut}
            className="w-full px-3 py-2 text-left text-xs hover:bg-gray-100 flex items-center gap-2"
            title="Sign out of Quodsi"
          >
            <LogOut className="w-3 h-3 text-gray-500" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};

export const AccountStrip: React.FC = () => (
  <div className="flex items-center justify-between gap-2 p-2 bg-gray-50 border-b border-gray-200 flex-shrink-0">
    <div className="flex items-center gap-2 min-w-0">
      <PlanBadge />
    </div>
    <div className="flex-shrink-0">
      <AuthStatusIndicator />
    </div>
  </div>
);

export default AccountStrip;
