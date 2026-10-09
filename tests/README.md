# `tests`

Automated regression tests for domain invariants, generation lifecycle, provider/cache behavior, and background processing.

Inputs are deterministic fixtures/mocks; outputs are pass/fail assertions. Tests should prove safety-critical invariants rather than depend on live provider services.

Run with `npm test`. Add regression coverage whenever a bug fixes a previously untested invariant.
