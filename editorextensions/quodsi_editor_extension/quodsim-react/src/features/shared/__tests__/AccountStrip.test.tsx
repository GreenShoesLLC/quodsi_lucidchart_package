// @quodsi/lucid-shared transitively requires axios (ESM entry CRA's Jest can't parse).
jest.mock("axios", () => ({}));

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

const mockAuthState: any = {
  isAuthenticated: true,
  user: { id: "u1", email: "a@b.com", displayName: "Ann B" },
  config: undefined,
};
let mockEntitlementsState: any;

jest.mock("../../../messaging/MessageContext", () => ({
  useAuth: () => mockAuthState,
  useEntitlements: () => mockEntitlementsState,
}));

const mockRequestPortalUrl = jest.fn().mockResolvedValue("https://portal.example");
jest.mock("../../../messaging/senders/portalSender", () => ({
  usePortalSender: () => ({ requestPortalUrl: mockRequestPortalUrl }),
}));

const mockRequestAuth = jest.fn();
const mockLogout = jest.fn();
jest.mock("../../../messaging/senders/authSender", () => ({
  useAuthSender: () => ({ requestAuth: mockRequestAuth, logout: mockLogout }),
}));

const mockPingUpgradeInterest = jest.fn().mockResolvedValue(undefined);
jest.mock("../../../messaging/senders/upgradeInterestSender", () => ({
  useUpgradeInterestSender: () => ({ pingUpgradeInterest: mockPingUpgradeInterest }),
}));

import { AccountStrip } from "../AccountStrip";

function openPlanDetails() {
  fireEvent.click(screen.getByRole("button", { name: /Ann B/ }));
  fireEvent.click(screen.getByRole("button", { name: /Plan details/ }));
}

// Paying plan — used for row-display / fallback-note / default-tone cases.
// Contact block must NOT show for this plan (Task 8 review fix #1).
const PRO_ENTITLEMENTS = {
  loaded: true,
  subjectType: "organization",
  planKey: "quodsi_pro",
  planStatus: "active",
  trialExpiresAt: null,
  features: { simulations_per_month: { limit: 25, used: 3 } },
  upgradeAvailable: true,
  planSource: "kinde_org",
  orgName: "Acme Co",
  studiesUsed: 1,
  studiesPerOrgLimit: 10,
  scenariosPerStudyLimit: 25,
  replicationsPerScenarioLimit: 100,
  tradeoffAnalysis: true,
  chartExport: true,
};

// Free plan, same task-7 fields present — used for contact-block-visible cases.
const FREE_ENTITLEMENTS = {
  ...PRO_ENTITLEMENTS,
  planKey: "quodsi_free",
};

// planSource present, but the three limit fields are explicitly null
// (backend's way of saying "unlimited" once the seam lands).
const FREE_ENTITLEMENTS_UNLIMITED = {
  ...FREE_ENTITLEMENTS,
  studiesUsed: 0,
  studiesPerOrgLimit: null,
  scenariosPerStudyLimit: null,
  replicationsPerScenarioLimit: null,
};

// Simulates a backend that hasn't started sending Task 7's fields yet.
const OLD_HOST_ENTITLEMENTS = {
  loaded: true,
  subjectType: "organization",
  planKey: "quodsi_free",
  planStatus: "active",
  trialExpiresAt: null,
  features: {},
  upgradeAvailable: true,
  planSource: null,
  orgName: null,
  studiesUsed: null,
  studiesPerOrgLimit: null,
  scenariosPerStudyLimit: null,
  replicationsPerScenarioLimit: null,
  tradeoffAnalysis: null,
  chartExport: null,
};

const mockWriteText = jest.fn();

beforeEach(() => {
  mockEntitlementsState = PRO_ENTITLEMENTS;
  mockAuthState.config = undefined;
  mockRequestPortalUrl.mockClear();
  mockRequestAuth.mockClear();
  mockLogout.mockClear();
  mockPingUpgradeInterest.mockClear().mockResolvedValue(undefined);
  mockWriteText.mockReset().mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText: mockWriteText } });
});

describe("AccountStrip / PlanBadge", () => {
  it("renders the plan display name in the chip", () => {
    render(<AccountStrip />);
    expect(screen.getByText("Professional")).toBeInTheDocument();
  });

  it("shows no usage numbers on the chip face", () => {
    // PRO_ENTITLEMENTS carries simulations 3 of 25 — a re-added suffix or
    // tooltip would fail this substring check rather than pass vacuously.
    const { container } = render(<AccountStrip />);
    const chip = screen.getByText("Professional");
    expect(chip.textContent).not.toMatch(/25/);
    expect(chip.textContent).not.toMatch(/runs|remaining/i);
    // And nothing on the page leaks it via a title tooltip.
    const titled = Array.from(container.querySelectorAll("[title]"));
    expect(titled.some((el) => /remaining|\bof\b/i.test(el.getAttribute("title") ?? ""))).toBe(false);
    // Digits are the sharper signal: a re-added "23/1000 runs" suffix would
    // pass the word-based regex above (no "of"/"remaining" substring) but
    // must still fail here.
    expect(chip.getAttribute("title")).not.toMatch(/\d/);
  });

  it("is not an interactive chip", () => {
    render(<AccountStrip />);
    expect(screen.getByText("Professional").tagName).toBe("SPAN");
  });

  it("keeps the trial countdown off the chip face and inside Plan details", () => {
    mockEntitlementsState = {
      ...PRO_ENTITLEMENTS,
      planStatus: "trialing",
      trialExpiresAt: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
    };
    render(<AccountStrip />);
    expect(screen.getByText("Professional").textContent).not.toMatch(/Trial/i);

    fireEvent.click(screen.getByRole("button", { name: /Ann B/ }));
    fireEvent.click(screen.getByRole("button", { name: /Plan details/ }));
    // Exact match, not /Trial/i: planStatus "trialing" also renders as
    // "Professional (trialing)" in the Plan row, which would otherwise
    // ambiguously match a case-insensitive "Trial" substring too.
    expect(screen.getByText("Trial")).toBeInTheDocument();
  });

  it("keeps usage two clicks deep", () => {
    render(<AccountStrip />);
    expect(screen.queryByText("Runs this month")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Ann B/ }));
    expect(screen.getByRole("button", { name: /Plan details/ })).toBeInTheDocument();
    expect(screen.queryByText("Runs this month")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Plan details/ }));
    expect(screen.getByText("Runs this month")).toBeInTheDocument();
  });

  it("is hidden entirely when entitlements have not loaded", () => {
    mockEntitlementsState = { ...PRO_ENTITLEMENTS, loaded: false };
    render(<AccountStrip />);
    expect(screen.queryByText(/Professional/)).toBeNull();
  });

  it("is hidden entirely when upgradeAvailable is false", () => {
    mockEntitlementsState = { ...PRO_ENTITLEMENTS, upgradeAvailable: false };
    render(<AccountStrip />);
    expect(screen.queryByText(/Professional/)).toBeNull();
  });

  it("offers no Plan details control when upgradeAvailable is false, even with the menu open", () => {
    // Billing dark (BILLING_MODE=off in every environment today): the chip
    // is gone (covered above), but the account menu's trigger is unrelated
    // to the chip and still opens. Without this gate the disclosure button
    // would render, flip its caret, and expand into nothing.
    mockEntitlementsState = { ...PRO_ENTITLEMENTS, upgradeAvailable: false };
    render(<AccountStrip />);
    fireEvent.click(screen.getByRole("button", { name: /Ann B/ }));
    expect(screen.queryByRole("button", { name: /Plan details/ })).toBeNull();
    expect(screen.queryByText("Runs this month")).toBeNull();
  });

  it("opens the dropdown with rows populated from slice values when fields are present", () => {
    render(<AccountStrip />);
    openPlanDetails();

    expect(screen.getByText("Plan")).toBeInTheDocument();
    expect(screen.getByText("Professional (active)")).toBeInTheDocument();
    expect(screen.getByText("Runs this month")).toBeInTheDocument();
    expect(screen.getByText("3 of 25")).toBeInTheDocument();
    expect(screen.getByText("Studies")).toBeInTheDocument();
    expect(screen.getByText("1 of 10")).toBeInTheDocument();
    expect(screen.getByText("Scenarios per study")).toBeInTheDocument();
    expect(screen.getByText("25", { selector: "span.text-gray-700" })).toBeInTheDocument();
    expect(screen.getByText("Replications per run")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("Tradeoff Analysis")).toBeInTheDocument();
    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("shows the fallback note only when planSource is free_fallback", () => {
    mockEntitlementsState = { ...PRO_ENTITLEMENTS, planSource: "free_fallback" };
    render(<AccountStrip />);
    openPlanDetails();
    expect(
      screen.getByText("No plan assigned — using default Free limits")
    ).toBeInTheDocument();
  });

  it("hides the fallback note when planSource is a real Kinde source", () => {
    render(<AccountStrip />);
    openPlanDetails();
    expect(
      screen.queryByText("No plan assigned — using default Free limits")
    ).toBeNull();
  });

  it("hides the fallback note when planSource is absent (old host)", () => {
    mockEntitlementsState = OLD_HOST_ENTITLEMENTS;
    render(<AccountStrip />);
    openPlanDetails();
    expect(
      screen.queryByText("No plan assigned — using default Free limits")
    ).toBeNull();
  });
});

describe("AccountStrip / PlanDetails — the three study-keyed limit rows (planSource sentinel)", () => {
  it("hides Studies / Scenarios per study / Replications per run when planSource is absent (old host)", () => {
    mockEntitlementsState = OLD_HOST_ENTITLEMENTS;
    render(<AccountStrip />);
    openPlanDetails();

    expect(screen.queryByText("Runs this month")).toBeNull();
    expect(screen.queryByText("Studies")).toBeNull();
    expect(screen.queryByText("Scenarios per study")).toBeNull();
    expect(screen.queryByText("Replications per run")).toBeNull();
    expect(screen.queryByText("Tradeoff Analysis")).toBeNull();
  });

  it("shows the three rows with real values when planSource is present and limits are finite", () => {
    render(<AccountStrip />); // PRO_ENTITLEMENTS: planSource 'kinde_org', finite limits
    openPlanDetails();

    expect(screen.getByText("Studies")).toBeInTheDocument();
    expect(screen.getByText("1 of 10")).toBeInTheDocument();
    expect(screen.getByText("Scenarios per study")).toBeInTheDocument();
    expect(screen.getByText("Replications per run")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.queryByText("Unlimited")).toBeNull();
  });

  it("shows the three rows as 'Unlimited' when planSource is present but the limit fields are explicit null", () => {
    mockEntitlementsState = FREE_ENTITLEMENTS_UNLIMITED;
    render(<AccountStrip />);
    openPlanDetails();

    expect(screen.getByText("Studies")).toBeInTheDocument();
    expect(screen.getByText("Scenarios per study")).toBeInTheDocument();
    expect(screen.getByText("Replications per run")).toBeInTheDocument();
    // formatUsage/formatLimit both render a bare "Unlimited" when the limit
    // is null (matching Studio's PlanBadge — usage isn't shown alongside an
    // unlimited quota), so all three rows collapse to the same text.
    expect(screen.getAllByText("Unlimited")).toHaveLength(3);
  });
});

describe("AccountStrip / PlanDetails — contact-to-upgrade affordance (free plan only)", () => {
  it("shows the contact block for the quodsi_free plan", () => {
    mockEntitlementsState = FREE_ENTITLEMENTS;
    render(<AccountStrip />);
    openPlanDetails();
    expect(
      screen.getByRole("link", { name: /Contact us to upgrade/i })
    ).toBeInTheDocument();
  });

  it("hides the contact block for a paying plan (quodsi_pro)", () => {
    render(<AccountStrip />); // PRO_ENTITLEMENTS
    openPlanDetails();
    expect(
      screen.queryByRole("link", { name: /Contact us to upgrade/i })
    ).toBeNull();
    expect(screen.queryByText(/^Copy$/i)).toBeNull();
  });

  it("hides the contact block for the employee plan", () => {
    mockEntitlementsState = { ...PRO_ENTITLEMENTS, planKey: "quodsi_employee" };
    render(<AccountStrip />);
    openPlanDetails();
    expect(
      screen.queryByRole("link", { name: /Contact us to upgrade/i })
    ).toBeNull();
  });

  it("defaults the sales address to sales@quodsi.com when config.salesEmail is absent", () => {
    mockEntitlementsState = FREE_ENTITLEMENTS;
    render(<AccountStrip />);
    openPlanDetails();
    expect(screen.getByText("sales@quodsi.com")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Contact us to upgrade/i })
    ).toHaveAttribute("href", expect.stringContaining("mailto:sales@quodsi.com"));
  });

  it("uses config.salesEmail when the host provides one", () => {
    mockEntitlementsState = FREE_ENTITLEMENTS;
    mockAuthState.config = { salesEmail: "biz@quodsi.com" };
    render(<AccountStrip />);
    openPlanDetails();
    expect(screen.getByText("biz@quodsi.com")).toBeInTheDocument();
  });

  it("Copy claims success only when the clipboard write succeeds", async () => {
    mockEntitlementsState = FREE_ENTITLEMENTS;
    render(<AccountStrip />);
    openPlanDetails();
    fireEvent.click(screen.getByRole("button", { name: /^copy$/i }));

    await screen.findByRole("button", { name: /copied/i });
    expect(mockWriteText).toHaveBeenCalledWith("sales@quodsi.com");
  });

  it("Copy does not claim success when the clipboard write fails", async () => {
    mockEntitlementsState = FREE_ENTITLEMENTS;
    mockWriteText.mockRejectedValue(new Error("clipboard blocked"));
    render(<AccountStrip />);
    openPlanDetails();
    fireEvent.click(screen.getByRole("button", { name: /^copy$/i }));

    // Give the rejected clipboard promise a tick to settle.
    await Promise.resolve();
    await Promise.resolve();

    expect(screen.queryByRole("button", { name: /copied/i })).toBeNull();
    expect(screen.getByRole("button", { name: /^copy$/i })).toBeInTheDocument();
  });

  it("pings upgrade interest when the contact link is clicked", () => {
    mockEntitlementsState = FREE_ENTITLEMENTS;
    render(<AccountStrip />);
    openPlanDetails();
    fireEvent.click(screen.getByRole("link", { name: /Contact us to upgrade/i }));
    expect(mockPingUpgradeInterest).toHaveBeenCalledWith("upgrade");
  });

  it("pings upgrade interest when the Copy button is clicked", async () => {
    mockEntitlementsState = FREE_ENTITLEMENTS;
    render(<AccountStrip />);
    openPlanDetails();
    fireEvent.click(screen.getByRole("button", { name: /^copy$/i }));
    await screen.findByRole("button", { name: /copied/i });
    expect(mockPingUpgradeInterest).toHaveBeenCalledWith("upgrade");
  });
});

describe("AccountStrip / PlanBadge — tone", () => {
  it("uses the danger tone when studies are exhausted (even though runs quota is fine)", () => {
    mockEntitlementsState = {
      ...PRO_ENTITLEMENTS,
      features: { simulations_per_month: { limit: 100, used: 10 } }, // runs fine
      studiesUsed: 10,
      studiesPerOrgLimit: 10, // exhausted
    };
    render(<AccountStrip />);
    const chip = screen.getByText("Professional");
    expect(chip.className).toContain("bg-red-50");
  });

  it("uses the warning tone when studies are near their limit (>=80%, runs quota fine)", () => {
    mockEntitlementsState = {
      ...PRO_ENTITLEMENTS,
      features: { simulations_per_month: { limit: 100, used: 10 } }, // runs fine
      studiesUsed: 8,
      studiesPerOrgLimit: 10, // 80% -> near limit
    };
    render(<AccountStrip />);
    const chip = screen.getByText("Professional");
    expect(chip.className).toContain("bg-amber-50");
  });

  it("uses the neutral tone for the employee plan (no explicit employee branch — falls through the default)", () => {
    mockEntitlementsState = {
      ...PRO_ENTITLEMENTS,
      planKey: "quodsi_employee",
      features: { simulations_per_month: { limit: 100, used: 10 } },
      studiesUsed: 1,
      studiesPerOrgLimit: 10,
    };
    render(<AccountStrip />);
    const chip = screen.getByText("Employee");
    expect(chip.className).toContain("bg-gray-50");
  });
});

describe("AccountStrip / AuthStatusIndicator — Sign Out collapses Plan details", () => {
  // Controller-directed addition (Task 2 review carryover): Lucid's Sign Out
  // opens the Kinde logout URL in a new tab and calls authSender.logout(),
  // which clears state IN PLACE — no redirect/remount like Studio's flow.
  // Without resetting detailsOpen here, a sign-out followed by a sign-in
  // would reopen the menu with Plan details already expanded.
  it("collapses an expanded Plan details disclosure when the user signs out", () => {
    render(<AccountStrip />);
    openPlanDetails();
    expect(screen.getByText("Runs this month")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Sign Out/ }));
    expect(mockLogout).toHaveBeenCalled();

    // Reopen the account menu: Plan details must start collapsed again.
    fireEvent.click(screen.getByRole("button", { name: /Ann B/ }));
    expect(screen.getByRole("button", { name: /Plan details/ })).toBeInTheDocument();
    expect(screen.queryByText("Runs this month")).toBeNull();
  });
});

describe("AccountStrip / AuthStatusIndicator — trigger close collapses Plan details", () => {
  // Final-review fix wave: the trigger's own toggle used to close the menu
  // without resetting detailsOpen — only the outside-click path (and Sign
  // Out, covered above) did. Clicking the trigger again is the most natural
  // way to close a dropdown, so this must reset it too.
  it("collapses Plan details when the trigger closes the menu, not just on outside click or Sign Out", () => {
    render(<AccountStrip />);
    openPlanDetails();
    expect(screen.getByText("Runs this month")).toBeInTheDocument();

    // Close via the trigger itself.
    fireEvent.click(screen.getByRole("button", { name: /Ann B/ }));
    expect(screen.queryByText("Runs this month")).toBeNull();

    // Reopening starts collapsed again.
    fireEvent.click(screen.getByRole("button", { name: /Ann B/ }));
    expect(screen.getByRole("button", { name: /Plan details/ })).toBeInTheDocument();
    expect(screen.queryByText("Runs this month")).toBeNull();
  });
});
