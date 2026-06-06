import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('axios', () => ({}));

const mockOpenScenariosModal = jest.fn();
jest.mock('../../../messaging/senders/simulationRunSender', () => ({
  useSimulationRunSender: () => ({ openScenariosModal: mockOpenScenariosModal }),
}));

jest.mock('../../../messaging/MessageProvider', () => ({
  useMessaging: () => ({
    selection: { documentContext: { documentId: 'doc-1', pageId: 'page-1' } },
  }),
}));

import { ScenariosLaunchButton } from '../ScenariosLaunchButton';

describe('ScenariosLaunchButton', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('opens the scenarios modal with the selection documentId + pageId', () => {
    render(<ScenariosLaunchButton />);
    fireEvent.click(screen.getByTestId('open-scenarios-modal'));
    expect(mockOpenScenariosModal).toHaveBeenCalledWith('doc-1', 'page-1');
  });
});
