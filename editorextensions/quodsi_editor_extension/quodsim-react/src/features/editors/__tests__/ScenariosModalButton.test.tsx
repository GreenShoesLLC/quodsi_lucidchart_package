import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('axios', () => ({}));

const mockOpenScenariosModal = jest.fn();
jest.mock('../../../messaging/senders/simulationRunSender', () => ({
  useSimulationRunSender: () => ({ openScenariosModal: mockOpenScenariosModal }),
}));

import { ModelEditorScenariosButton } from '../ModelEditor';

describe('ModelEditorScenariosButton', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('renders a button that opens the scenarios modal with documentId + pageId', () => {
    render(<ModelEditorScenariosButton documentId="doc-1" pageId="page-1" />);
    fireEvent.click(screen.getByTestId('open-scenarios-modal'));
    expect(mockOpenScenariosModal).toHaveBeenCalledWith('doc-1', 'page-1');
  });
});
