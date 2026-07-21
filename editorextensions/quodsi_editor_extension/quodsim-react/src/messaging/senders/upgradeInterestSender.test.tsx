// @quodsi/lucid-shared transitively requires axios (ESM entry CRA's Jest can't parse).
jest.mock("axios", () => ({}));

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { EnvelopeMessageType } from '@quodsi/lucid-shared';

jest.mock('../MessageProvider', () => ({
  useMessaging: () => ({ app: { panelType: 'model' } }),
}));

import { useUpgradeInterestSender } from './upgradeInterestSender';

function Harness({ onResult }: { onResult: (r: 'resolved' | 'rejected') => void }) {
  const { pingUpgradeInterest } = useUpgradeInterestSender();
  return (
    <button
      onClick={() => {
        pingUpgradeInterest('upgrade').then(
          () => onResult('resolved'),
          () => onResult('rejected'),
        );
      }}
    >
      ping
    </button>
  );
}

describe('useUpgradeInterestSender', () => {
  afterEach(() => jest.restoreAllMocks());

  test('posts an UPGRADE_INTEREST_PING envelope with the feature payload', () => {
    const postMessageSpy = jest.spyOn(window.parent, 'postMessage').mockImplementation(() => {});
    render(<Harness onResult={() => {}} />);

    fireEvent.click(screen.getByText('ping'));

    expect(postMessageSpy).toHaveBeenCalledTimes(1);
    const [envelope] = postMessageSpy.mock.calls[0];
    expect(envelope).toMatchObject({
      type: EnvelopeMessageType.UPGRADE_INTEREST_PING,
      source: 'model-iframe',
      target: 'host',
      version: '1.0',
      data: { feature: 'upgrade' },
    });
    expect(typeof (envelope as any).id).toBe('string');
  });

  test('resolves when the host acks with ok: true', () => {
    jest.spyOn(window.parent, 'postMessage').mockImplementation((envelope: any) => {
      // Simulate the host replying synchronously with a matching result envelope.
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            id: envelope.id,
            type: EnvelopeMessageType.UPGRADE_INTEREST_PING_RESULT,
            source: 'host',
            target: 'model-iframe',
            version: '1.0',
            data: { ok: true },
          },
        }),
      );
    });

    const onResult = jest.fn();
    render(<Harness onResult={onResult} />);
    fireEvent.click(screen.getByText('ping'));

    return Promise.resolve().then(() => {
      expect(onResult).toHaveBeenCalledWith('resolved');
    });
  });

  test('rejects when the host acks with ok: false', () => {
    jest.spyOn(window.parent, 'postMessage').mockImplementation((envelope: any) => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            id: envelope.id,
            type: EnvelopeMessageType.UPGRADE_INTEREST_PING_RESULT,
            source: 'host',
            target: 'model-iframe',
            version: '1.0',
            data: { ok: false, error: 'not_wired' },
          },
        }),
      );
    });

    const onResult = jest.fn();
    render(<Harness onResult={onResult} />);
    fireEvent.click(screen.getByText('ping'));

    return Promise.resolve().then(() => {
      expect(onResult).toHaveBeenCalledWith('rejected');
    });
  });
});
