// ActionEditor.name.test.tsx
//
// Verifies the optional "Name" input in the Action editor: editing it patches
// `name` onto the action draft via onChange.

// @quodsi/lucid-shared pulls in lucidApi.js -> axios ESM, which Jest can't parse.
jest.mock("axios", () => ({}));

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ActionEditor } from "../ActionEditor";
import { createDelayAction, Duration } from "@quodsi/lucid-shared";

it("edits the action name via the Name input", () => {
  const onChange = jest.fn();
  const action = createDelayAction(new Duration());

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
