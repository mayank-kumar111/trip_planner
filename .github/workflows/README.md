# CI Workflows

The workflow in this directory is the repository quality gate.

It installs locked dependencies, audits high/critical vulnerabilities, typechecks, runs regression tests, and builds the application. A green workflow on the exact release commit is required before beta deployment.
