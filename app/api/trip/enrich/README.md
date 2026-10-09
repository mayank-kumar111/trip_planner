# `api/trip/enrich`

Trip enrichment boundary for resolving candidate places and calculating trip intelligence. Inputs are authenticated, validated trip plans; output is enriched trip data/metrics or a safe failure.

This path uses shared Places logic and bounded provider calls. The persistent background processor is the preferred generation path.
