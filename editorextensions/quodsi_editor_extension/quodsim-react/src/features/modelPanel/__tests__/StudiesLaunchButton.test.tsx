import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('axios', () => ({}));

const mockOpenStudiesModal = vi.fn();
vi.mock('../../../messaging/senders/simulationRunSender', () => ({
  useSimulationRunSender: () => ({ openStudiesModal: mockOpenStudiesModal }),
}));

vi.mock('../../../messaging/MessageProvider', () => ({
  useMessaging: () => ({
    selection: { documentContext: { documentId: 'doc1', pageId: 'pg1' } },
  }),
}));

import { StudiesLaunchButton } from '../StudiesLaunchButton';

describe('StudiesLaunchButton', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders a Studies button and launches the studies modal', () => {
    render(<StudiesLaunchButton />);
    const btn = screen.getByTestId('open-studies-modal');
    expect(btn).toHaveTextContent(/studies/i);
    fireEvent.click(btn);
    expect(mockOpenStudiesModal).toHaveBeenCalledWith('doc1', 'pg1');
  });
});
