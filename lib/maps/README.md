# `lib/maps`

Google Routes integration and route caching/concurrency controls.

Inputs are validated coordinates/itinerary sequences; outputs are route metadata/segments and provider/cache metrics. Requests are bounded by timeout, TTL cache, in-flight dedupe, and concurrency limits.

Impact: route changes affect provider cost, latency, and itinerary navigation.
