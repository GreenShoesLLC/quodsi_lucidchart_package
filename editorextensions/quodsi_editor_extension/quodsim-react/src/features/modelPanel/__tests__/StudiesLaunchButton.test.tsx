import { render, screen, fireEvent } from '@testing-library/react';

const mockOpenStudiesModal = vi.fn();
vi.mock('../../../messaging/senders/simulationRunSender', () => ({
  useSimulationRunSender: () => ({ openStudiesModal: mockOpenStudiesModal }),
}));

vi.mock('../../../messaging/MessageProvider', () => ({
  useMessaging: () => ({
    selection: { documentContext: { documentId: 'doc1', pageId: 'pg1' } },
  }),
}));

let mockAuthState: any = { isAuthenticated: false };
vi.mock('../../../messaging/MessageContext', () => ({
  useAuth: () => mockAuthState,
}));

let mockValidationState: any = { errorCount: 0 };
vi.mock('../../../messaging/hooks/useValidationState', () => ({
  useValidationState: () => mockValidationState,
}));

import { StudiesLaunchButton } from '../StudiesLaunchButton';

// The shared button's titles, disabled states and variants are pinned in
// quodsi_studio (platforms/shared/__tests__/StudiesLaunchButton.test.tsx).
// This file pins only what LucidChart feeds it.
describe('StudiesLaunchButton (Lucid host)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState = { isAuthenticated: false };
    mockValidationState = { errorCount: 0 };
  });

  it('maps signed out to the shared signed-out state', () => {
    render(<StudiesLaunchButton />);
    const btn = screen.getByTestId('studies-launch-button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('title', 'Sign in to use Studies');
    fireEvent.click(btn);
    expect(mockOpenStudiesModal).not.toHaveBeenCalled();
  });

  it("passes the extension's error count as the blocker count", () => {
    mockAuthState = { isAuthenticated: true };
    mockValidationState = { errorCount: 2 };
    render(<StudiesLaunchButton />);
    const btn = screen.getByTestId('studies-launch-button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('title', "Fix 2 validation errors before opening Studies — see the Model's Validation tab");
  });

  it('renders the full-width variant and opens Studies for this document and page', () => {
    mockAuthState = { isAuthenticated: true };
    render(<StudiesLaunchButton />);
    const btn = screen.getByTestId('studies-launch-button');
    expect(btn).toHaveClass('w-full');
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(mockOpenStudiesModal).toHaveBeenCalledWith('doc1', 'pg1');
  });
});
