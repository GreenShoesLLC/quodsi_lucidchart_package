// @quodsi/shared may be pulled in transitively -> axios ESM, which CRA's Jest
// transformer can't parse. (Same pattern as the sibling analysis tests.)
jest.mock("axios", () => ({}));

import { getColumnsForDataType } from "../crossRepTableConfigs";

// The active engine cross-rep exporter writes entity_summary_summary.csv with
// identity column `entity_type` and created column `total_created_mean`
// (quodsim cross_rep_exporter.py). The entity table config must key on those,
// not the legacy `entity_name`/`created_mean` schema, or the entity tab shows
// "No entity data available" despite valid data.
describe("crossRepTableConfigs — entity columns match the active engine schema", () => {
  it("entity columns key on entity_type, not the legacy entity_name", () => {
    const keys = getColumnsForDataType("entity").map((c) => c.key);
    expect(keys).toContain("entity_type");
    expect(keys).not.toContain("entity_name");
  });

  it("entity 'Created' column keys on total_created_mean, not the legacy created_mean", () => {
    const keys = getColumnsForDataType("entity").map((c) => c.key);
    expect(keys).toContain("total_created_mean");
    expect(keys).not.toContain("created_mean");
  });

  it("activity columns still key on activity_name (unchanged — already correct)", () => {
    const keys = getColumnsForDataType("activity").map((c) => c.key);
    expect(keys).toContain("activity_name");
  });
});
