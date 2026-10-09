# `context`

React context definitions for shared client application state.

`UserDetailContext` exposes typed authenticated-user display/application data. Context does not establish authorization; server-side Clerk/Convex checks remain authoritative.

Impact: changes affect many client consumers, so preserve types and provider/consumer contracts.
