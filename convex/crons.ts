import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "Recover stale trip generation jobs",
  { minutes: 1 },
  internal.tripDetail.recoverStaleTripGenerationJobs,
  {},
);

export default crons;
