// ActionEditor.name.test.tsx
//
// Verifies the optional "Name" input in the Action editor: editing it patches
// `name` onto the action draft via onChange.

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ActionEditor } from "../ActionEditor";
import { createDelayAction, Duration, PeriodUnit } from "@quodsi/lucid-shared";

it("edits the action name via the Name input", () => {
  const onChange = vi.fn();
  const action = createDelayAction(Duration.constant(0, PeriodUnit.MINUTES));

  render(
    <ActionEditor
      action={action}
      index={0}
      expanded={true}
      onToggleExpand={() => {}}
      onDelete={() => {}}
      onChange={onChange}
    />
  );

  fireEvent.change(screen.getByLabelText(/action name/i), {
    target: { value: "Triage" },
  });

  expect(onChange).toHaveBeenCalledWith(
    expect.objectContaining({ name: "Triage" })
  );
});
