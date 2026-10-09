export type GenerationPipelineMetrics = {
  placesRequests: number;
  placesCacheHits: number;
  routeRequests: number;
  routeCacheHits: number;
  providerFailures: number;
};

export type GenerationPipelineHooks<Plan, EnrichedPlan, Intelligence, RouteResult> = {
  enrich: (plan: Plan, metrics: GenerationPipelineMetrics) => Promise<EnrichedPlan>;
  optimize: (plan: EnrichedPlan) => Intelligence;
  saveEnriched: (plan: EnrichedPlan, intelligence: Intelligence) => Promise<void>;
  route: (
    intelligence: Intelligence,
    plan: EnrichedPlan,
    metrics: GenerationPipelineMetrics,
  ) => Promise<RouteResult>;
  saveRouted: (
    plan: EnrichedPlan,
    intelligence: Intelligence,
    routeResult: RouteResult,
  ) => Promise<void>;
  setStage: (status: "enriching" | "enriched" | "routing") => Promise<void>;
  complete: (metrics: GenerationPipelineMetrics) => Promise<void>;
  fail: (metrics: GenerationPipelineMetrics) => Promise<void>;
};

export async function runGenerationPipeline<Plan, EnrichedPlan, Intelligence, RouteResult>({
  plan,
  hooks,
}: {
  plan: Plan;
  hooks: GenerationPipelineHooks<Plan, EnrichedPlan, Intelligence, RouteResult>;
}) {
  const metrics: GenerationPipelineMetrics = {
    placesRequests: 0,
    placesCacheHits: 0,
    routeRequests: 0,
    routeCacheHits: 0,
    providerFailures: 0,
  };

  try {
    await hooks.setStage("enriching");
    const enrichedPlan = await hooks.enrich(plan, metrics);
    const intelligence = hooks.optimize(enrichedPlan);

    await hooks.saveEnriched(enrichedPlan, intelligence);
    await hooks.setStage("enriched");
    await hooks.setStage("routing");

    const routeResult = await hooks.route(intelligence, enrichedPlan, metrics);
    await hooks.saveRouted(enrichedPlan, intelligence, routeResult);

    await hooks.complete(metrics);
    return { status: "completed" as const, metrics };
  } catch (error) {
    metrics.providerFailures += 1;
    try {
      await hooks.fail(metrics);
    } catch {
      // Preserve the original pipeline error if terminal job persistence also fails.
    }
    return { status: "failed" as const, metrics, error };
  }
}
