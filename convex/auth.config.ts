const authConfig = {
  providers: [
    {
      // Clerk's Frontend API URL / JWT issuer domain.
      // Configure CLERK_JWT_ISSUER_DOMAIN on the Convex deployment.
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
};

export default authConfig;
