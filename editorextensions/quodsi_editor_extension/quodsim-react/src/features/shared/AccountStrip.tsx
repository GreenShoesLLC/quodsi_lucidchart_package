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
import {
  planDisplayLabel,
  simulationsRemaining,
  trialDaysRemaining,
} from "../../messaging/state/entitlementsSlice";

const PlanBadge: React.FC = () => {
  const auth = useAuth();
  const entitlements = useEntitlements();
  if (!auth.isAuthenticated || !entitlements.loaded) return null;

  const label = planDisplayLabel(entitlements);
  const trialDays = trialDaysRemaining(entitlements);
  const remaining = simulationsRemaining(entitlements);

  const isTrial = trialDays !== null;
  const isLow = remaining !== null && remaining > 0 && remaining <= 2;
  const isExhausted = remaining !== null && remaining <= 0;

  const parts = [label];
  if (isTrial) parts.push(`Trial: ${trialDays}d`);

  const tone = isExhausted
    ? "bg-red-50 text-red-700 border-red-200"
    : isLow
    ? "bg-amber-50 text-amber-700 border-amber-200"
    : isTrial
    ? "bg-blue-50 text-blue-700 border-blue-200"
    : "bg-gray-50 text-gray-600 border-gray-200";

  const title = [
    `Plan: ${label}`,
    remaining !== null ? `Simulations remaining this month: ${remaining}` : null,
    isTrial ? `${trialDays} day${trialDays === 1 ? "" : "s"} left in trial` : null,
  ]
    .filter(Boolean)
    .join(" — ");

  return (
    <span
      className={`px-2 py-0.5 text-[10px] font-medium rounded border ${tone}`}
      title={title}
    >
      {parts.join(" • ")}
    </span>
  );
};

const AuthStatusIndicator: React.FC = () => {
  const auth = useAuth();
  const entitlements = useEntitlements();
  const authSender = useAuthSender();
  const { requestPortalUrl } = usePortalSender();
  const [authDropdownOpen, setAuthDropdownOpen] = useState(false);
  const [requestingUpgrade, setRequestingUpgrade] = useState(false);
  const authDropdownRef = useRef<HTMLDivElement>(null);

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
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 min-w-[160px]">
          {auth.user?.email && (
            <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100 truncate">
              {auth.user.email}
            </div>
          )}
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
