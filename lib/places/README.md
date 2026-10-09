# `lib/places`

Google Places integration and shared bounded cache.

Inputs are normalized place queries; outputs are factual provider place records plus cache/provider-request metrics. The cache uses TTL, size limits, in-flight deduplication, and bounded concurrency.

Canonical place identity is preferred by the trip layer to reduce duplicate lookups.
