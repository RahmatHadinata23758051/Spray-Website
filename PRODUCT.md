# PRODUCT — Spraybot Software MVP

Spraybot is a software-first interface for an automated spray-bottle testing machine used in an industrial R&D environment.

## Audience

- Operators who configure and run repeatable simulated spray tests.
- R&D analysts who inspect camera-specific measurements and temporal stability.
- Admin users who manage local accounts after authentication is wired.
- Internal/client stakeholders reviewing the future workflow before hardware exists.

## User needs

- Understand immediately that the system is in Simulation Mode.
- Configure a test with product/sample data and fixture scenario selection.
- Observe a mock synchronized camera capture flow.
- Inspect Side and Front camera analysis separately.
- Review deterministic results, history, and report previews.
- Trust that the UI is honest about mock data and future integration boundaries.

## Product truth

- No physical machine exists yet.
- No real cameras, PLC/ESP32, actuator response, or CV pipeline exists yet.
- Capture and analysis must use deterministic fixture data.
- The UI must never claim real hardware is online.

## Design posture

This is an internal industrial analysis application, not a landing page. The UI should feel precise, controlled, technical, clean, data-first, and restrained. The binding visual contract is `docs/DESIGN.md`.
