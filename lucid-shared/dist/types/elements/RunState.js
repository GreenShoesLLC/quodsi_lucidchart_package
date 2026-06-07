"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunState = void 0;
var RunState;
(function (RunState) {
    RunState["NotRun"] = "NOT_RUN";
    RunState["Queued"] = "QUEUED";
    RunState["Running"] = "RUNNING";
    RunState["RanWithErrors"] = "RAN_WITH_ERRORS";
    RunState["RanSuccessfully"] = "RAN_SUCCESSFULLY";
    RunState["Cancelled"] = "CANCELLED";
})(RunState = exports.RunState || (exports.RunState = {}));
