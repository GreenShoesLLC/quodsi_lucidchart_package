// Lucid mirror of the shared-panel QueueRankingSection. Behavior and copy come
// from @quodsi/lucid-shared (re-exported from @quodsi/shared) so the two
// implementations cannot drift on anything but markup. Uses Lucid's local
// styling conventions (text-xs, text-gray-700) rather than the shared panels'
// semantic tokens.

import React from "react";
import {
  QUEUE_RANKING_COPY,
  eligibleRankingStates,
  setRankingState,
  setRankingOrder,
  QueueRanking,
  QueueRankingOrder,
  State,
} from "@quodsi/lucid-shared";

interface Props {
  value?: QueueRanking;
  allStates: State[];
  onChange: (next: QueueRanking | undefined) => void;
}

export const QueueRankingSection: React.FC<Props> = ({ value, allStates, onChange }) => {
  const eligible = eligibleRankingStates(allStates);
  const hasEligible = eligible.length > 0;

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-gray-700">{QUEUE_RANKING_COPY.label}</label>
      <div>
        <label className="text-xs text-gray-600" htmlFor="lucid-queue-ranking-state">
          {QUEUE_RANKING_COPY.stateLabel}
        </label>
        <select
          id="lucid-queue-ranking-state"
          className="w-full px-2 py-1 text-xs border rounded"
          value={value?.stateName ?? ""}
          disabled={!hasEligible}
          onChange={(e) => onChange(setRankingState(value, e.target.value || null))}
        >
          <option value="">{QUEUE_RANKING_COPY.statePlaceholder}</option>
          {eligible.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs text-gray-600" htmlFor="lucid-queue-ranking-order">
          {QUEUE_RANKING_COPY.orderLabel}
        </label>
        <select
          id="lucid-queue-ranking-order"
          className="w-full px-2 py-1 text-xs border rounded"
          value={value?.order ?? "ASCENDING"}
          disabled={!hasEligible || !value}
          onChange={(e) => onChange(setRankingOrder(value, e.target.value as QueueRankingOrder))}
        >
          <option value="ASCENDING">{QUEUE_RANKING_COPY.orderAscending}</option>
          <option value="DESCENDING">{QUEUE_RANKING_COPY.orderDescending}</option>
        </select>
        <div className="text-xs text-gray-500 mt-1">{QUEUE_RANKING_COPY.orderHelp}</div>
      </div>
      {!hasEligible && (
        <div className="text-xs text-gray-500">{QUEUE_RANKING_COPY.noStatesHint}</div>
      )}
    </div>
  );
};
