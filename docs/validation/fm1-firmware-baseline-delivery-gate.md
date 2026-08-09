# FM-1 firmware-baseline delivery gate acceptance

Status: **SUPERSEDED — public-source baseline corrected 2026-08-09**

This receipt is retained as CI history for the implementation that introduced an explicit firmware constraint, but its original source interpretation is no longer accepted.

## Why it is superseded

The original acceptance treated **V15 · 2026-07-30** as the current official FM-1 PC-firmware baseline. A fresh review of the live M-VAVE download center on 2026-08-09 instead shows:

- Firmware → FM-1 Windows: **V14 · 2026-07-06**;
- Firmware → FM-1 Mac: **V14 · 2026-07-06**;
- PC Firmware → FM-1: **V09 · 2026-06-24**.

The official page does not explain how those differently labelled download tracks map to the firmware identity shown by a physical FM-1. The repository therefore no longer hard-codes any of those public labels as the device firmware required for delivery.

## Historical CI evidence

Validation PR: **#2 — Validate V15 delivery baseline on normal CI**  
PR head: `cb122edcf640d62098cbbc6a19521db2a963ad60`  
Merged to `main`: `4be483f8c2afd7cbc348e4edc23c16ec02e2a2a7`  
GitHub Actions workflow: **CI #1184**  
Workflow run ID: `31296462671`  
Job: `validate` (`93202220425`)

That run genuinely completed successfully for install, source/provenance audits, typecheck, lint/accessibility, full tests and production build. The CI result remains valid for the code it tested; only the external-source interpretation that selected V15 as a current device baseline is withdrawn.

## Replacement policy

The corrected policy is documented in `docs/research/fm1-firmware-baseline.md`:

- retain the official download-page entries as a reviewed source snapshot;
- do not infer the physical device firmware from either public download label;
- require the tester to record and explicitly enter the exact device firmware for a current-release delivery session;
- require Chrome and Edge to match that explicit device identity plus all existing v2/v3 evidence integrity requirements.

A new acceptance receipt should supersede this document once the corrected fail-closed delivery behavior has passed normal repository CI.

This document never represented a physical FM-1 PASS and does not close any hardware-dependent `PLAN.md` item.
