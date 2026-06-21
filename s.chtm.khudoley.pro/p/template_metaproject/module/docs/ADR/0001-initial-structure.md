# ADR 0001: Initial Template Module Structure

## Status

Accepted.

## Context

The metaproject needs a clean sibling module next to `core`. The module should show
the expected shape of a Chatium module without binding the template to a concrete
external integration.

## Decision

Create `p/template_metaproject/module` as a standard Chatium project shell with:

- generic UI, settings, logs and tests;
- broker contracts in `contracts/`;
- a server-side core broker wrapper in `lib/broker/`;
- Admin-only API for registration and sample event publishing.

## Consequences

The module can be copied as a starting point for future modules. Concrete modules
replace the sample contract and wrapper helpers with their own domain events while
keeping the same boundary with `core`.
