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

let mockValidationState: any = { hasErrors: false, errorCount: 0 };
vi.mock('../../../messaging/hooks/useValidationState', () => ({
  useValidationState: () => mockValidationState,
}));

import { StudiesLaunchButton } from '../StudiesLaunchButton';

describe('StudiesLaunchButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState = { isAuthenticated: false };
    mockValidationState = { hasErrors: false, errorCount: 0 };
  });

  it('is disabled and does not launch the studies modal when signed out', () => {
    mockAuthState = { isAuthenticated: false };
    render(<StudiesLaunchButton />);
    const btn = screen.getByTestId('open-studies-modal');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('title', 'Sign in to use Studies');
    fireEvent.click(btn);
    expect(mockOpenStudiesModal).not.toHaveBeenCalled();
  });

  it('renders an enabled Studies button and launches the studies modal when signed in', () => {
    mockAuthState = { isAuthenticated: true };
    render(<StudiesLaunchButton />);
    const btn = screen.getByTestId('open-studies-modal');
    expect(btn).toHaveTextContent(/studies/i);
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(mockOpenStudiesModal).toHaveBeenCalledWith('doc1', 'pg1');
  });

  it('is disabled with the error count in its title while the model has validation errors', () => {
    mockAuthState = { isAuthenticated: true };
    mockValidationState = { hasErrors: true, errorCount: 2 };
    render(<StudiesLaunchButton />);
    const btn = screen.getByTestId('open-studies-modal');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('title', 'Fix 2 validation errors before opening Studies — see the Validation tab');
    fireEvent.click(btn);
    expect(mockOpenStudiesModal).not.toHaveBeenCalled();
  });

  it('singularises the title for one error', () => {
    mockAuthState = { isAuthenticated: true };
    mockValidationState = { hasErrors: true, errorCount: 1 };
    render(<StudiesLaunchButton />);
    expect(screen.getByTestId('open-studies-modal'))
      .toHaveAttribute('title', 'Fix 1 validation error before opening Studies — see the Validation tab');
  });

  it('lets the sign-in title win over validation errors when signed out', () => {
    mockAuthState = { isAuthenticated: false };
    mockValidationState = { hasErrors: true, errorCount: 3 };
    render(<StudiesLaunchButton />);
    expect(screen.getByTestId('open-studies-modal')).toHaveAttribute('title', 'Sign in to use Studies');
  });
});
