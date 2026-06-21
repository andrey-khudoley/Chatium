# ADR 0001: Initial GetCourse Interface Structure

## Status

Accepted.

## Context

NESO meta needs a GetCourse interface module next to `core`. The module should keep
the standard Chatium project shell while owning GetCourse event contracts outside
the core broker project.

## Decision

Create `p/units/neso/meta/interfaces/getcourse` as a standard Chatium project shell with:

- generic UI, settings, logs and tests;
- broker contracts in `contracts/`;
- a server-side core broker wrapper in `lib/broker/`;
- Admin-only API for registration and GetCourse raw event publishing.

## Consequences

The module keeps the same boundary with `core` as other broker clients: it does
not import core internals and calls broker functions only through `runAppFunction`.
