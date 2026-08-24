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

import { StudiesLaunchButton } from '../StudiesLaunchButton';

describe('StudiesLaunchButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState = { isAuthenticated: false };
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
});
