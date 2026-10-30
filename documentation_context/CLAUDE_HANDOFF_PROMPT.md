# Prompt to paste into Claude

You are preparing formal academic documentation for a third-year engineering college project titled **FinTech System Load & Scalability Analyzer with Foreign Exchange Support**.

Problem statement: **How can a FinTech payment system handle increasing transaction loads without significant delays?**

Read every supplied context file before writing. Recommended reading order: PROJECT_CONTEXT.md, REQUIREMENTS_TRACEABILITY.md, API_REFERENCE.md, DATABASE_SCHEMA.md, TESTING_AND_RESULTS.md, DEPLOYMENT_CONTEXT.md; then inspect supplied source code, DEPLOYMENT.md and supporting evidence. This prompt is an instruction, not independent implementation evidence.

Treat the problem statement and actual source as primary sources of truth. Use verified database records, saved benchmark outputs, test logs and explicitly supplied screenshots as evidence. No screenshots have been verified in this package. Never invent performance numbers, improvements, completed features, test outcomes, citations or deployment status. Mark absent information **[INPUT REQUIRED]**. Identify conflicts between descriptions, evidence and source before using a claim. Dates and configurations must accompany reported measurements.

Describe service classes as in-process simulations, asyncio concurrency as bounded cooperative execution, and notifications/FX as simulated. Do not call this a distributed production payment platform. Distinguish application timings from end-to-end timings that include network, queue waits and persistence. Historical results with configuration/provenance anomalies must remain flagged; do not infer causal speedups from them. Do not claim a 10,000-transaction benchmark or live deployment without new evidence. Do not reinterpret a method declaration or UI label as proof that a setting affects processing.

Produce only the documentation deliverables I explicitly request next, without changing application code or the existing database. Use formal academic style appropriate for a third-year engineering project. Use diagrams and tables where they clarify verified relationships. Separate implemented, partially implemented, unimplemented and unverified features, and clearly label proposed future work. Do not generate the final report/presentation until I specify those deliverables.

Ask for missing institution details, report template, student/guide names, screenshots, live URLs or authoritative citations when needed; otherwise mark them [INPUT REQUIRED]. If browsing for citations, verify and attribute real sources. Preserve all known limitations in the resulting documentation rather than hiding them to fit the intended workflow.
