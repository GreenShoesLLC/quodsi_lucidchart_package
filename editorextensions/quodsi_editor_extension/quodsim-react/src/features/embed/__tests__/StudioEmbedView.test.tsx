import { render, screen, act } from '@testing-library/react';
import { EnvelopeMessageType } from '@quodsi/lucid-shared';

const mockSendMessage = jest.fn();
jest.mock('../../../messaging/MessageProvider', () => ({
  useMessaging: () => ({ sendMessage: mockSendMessage }),
}));
// Stub the heavy iframe host so we can assert which path it was handed.
jest.mock('../EmbeddedStudioFrame', () => ({
  EmbeddedStudioFrame: ({ studioPath }: { studioPath: string }) => (
    <div data-testid="frame">{studioPath}</div>
  ),
}));

// eslint-disable-next-line import/first
import { StudioEmbedView } from '../StudioEmbedView';

function setSearch(qs: string) {
  window.history.replaceState({}, '', `/?${qs}`);
}

function studioPathEnvelope(studioPath: string | null, error?: string) {
  return {
    id: 'm1',
    type: EnvelopeMessageType.STUDIO_EMBED_PATH,
    source: 'host',
    target: 'studio-embed-iframe',
    version: '1.0',
    data: { studioPath, error },
  };
}

/** Dispatch a host→iframe envelope. jsdom doesn't honor MessageEvent `source`
 *  from the constructor, so define it so the view's `e.source === window.parent`
 *  guard (window.parent === window in jsdom) passes. */
function relayFromHost(data: unknown) {
  const ev = new MessageEvent('message', { data });
  Object.defineProperty(ev, 'source', { value: window, configurable: true });
  act(() => {
    window.dispatchEvent(ev);
  });
}

describe('StudioEmbedView — pending pull', () => {
  beforeEach(() => mockSendMessage.mockClear());

  it('pending: shows a busy spinner, pulls the path, then renders the frame', () => {
    setSearch('view=studio-embed&pending=1&studioOrigin=https%3A%2F%2Fstudio.example&title=Studies');
    render(<StudioEmbedView />);

    // Modal chrome is up instantly (Close button) + a busy signal, and the pull fired.
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.getByTitle('Close and return to your diagram')).toBeInTheDocument();
    expect(mockSendMessage).toHaveBeenCalledWith(EnvelopeMessageType.REQUEST_STUDIO_EMBED_PATH);
    expect(screen.queryByTestId('frame')).toBeNull();

    // Host replies with the resolved path → the frame mounts at that path.
    relayFromHost(studioPathEnvelope('/embed/models/abc/studies'));
    expect(screen.getByTestId('frame')).toHaveTextContent('/embed/models/abc/studies');
  });

  it('pending: surfaces an error reply instead of hanging on the spinner', () => {
    setSearch('view=studio-embed&pending=1&studioOrigin=https%3A%2F%2Fstudio.example&title=Studies');
    render(<StudioEmbedView />);
    relayFromHost(studioPathEnvelope(null, 'model id unresolved'));
    expect(screen.getByText(/model id unresolved/i)).toBeInTheDocument();
    expect(screen.queryByTestId('frame')).toBeNull();
  });

  it('concrete studioPath: renders the frame immediately and never pulls', () => {
    setSearch('view=studio-embed&studioPath=%2Fembed%2Fmodels%2Fxyz%2Fstudies&studioOrigin=https%3A%2F%2Fstudio.example&title=Studies');
    render(<StudioEmbedView />);
    expect(screen.getByTestId('frame')).toHaveTextContent('/embed/models/xyz/studies');
    expect(mockSendMessage).not.toHaveBeenCalled();
  });
});
