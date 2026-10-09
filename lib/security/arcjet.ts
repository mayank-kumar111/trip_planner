import arcjet, { tokenBucket } from "@arcjet/next";

const arcjetKey = process.env.ARCJET_KEY;

export const aj = arcjet({
  key: arcjetKey ?? "development-placeholder-key",
  rules: [
    tokenBucket({
      mode: "LIVE",
      characteristics: ["userId"],
      refillRate: 500,
      interval: 86400,
      capacity: 500,
    }),
  ],
});

// Public endpoints cannot rely on a Clerk user ID. Arcjet tracks this bucket
// by client IP when no custom characteristics are configured.
export const publicPhotoAj = arcjet({
  key: arcjetKey ?? "development-placeholder-key",
  rules: [
    tokenBucket({
      mode: "LIVE",
      refillRate: 60,
      interval: 60,
      capacity: 60,
    }),
  ],
});
