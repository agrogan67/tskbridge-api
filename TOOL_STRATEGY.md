# TOOL_STRATEGY.md

## Feature Usage Log

1. **Repo grounding / repository identification**  
   - **What I used:** I anchored the work to the repository `agrogan67/tskbridge-api` and verified the repo before writing anything.  
   - **Why this feature:** I needed the exact repository context so I didn’t document the wrong project or describe an unrelated codebase. I used repository grounding instead of guessing because the instructions emphasized that the repo owner/name had to be known.  
   - **What happened:** I confirmed the repository exists, then pulled the repo instructions and key docs to frame the strategy document around the actual project scope.

2. **Repository file retrieval (`getfile`)**  
   - **What I used:** I opened `.github/copilot-instructions.md`, `README.md`, and `SPEC.md`.  
   - **Why this feature:** I needed precise, line-level source material from the repository itself, not a summary or a search result. `getfile` was better than search because I already knew the file paths and wanted exact content.  
   - **What happened:** I extracted the project purpose, architecture constraints, safety rules, and API expectations that shaped the document.

3. **Repository metadata lookup (`get-github-data`)**  
   - **What I used:** I checked the repository metadata and top-level contents.  
   - **Why this feature:** I wanted to confirm the default branch, repository visibility, and available top-level artifacts before drafting a file intended to live in the repo. This was more reliable than assuming structure from the description alone.  
   - **What happened:** I confirmed the default branch is `main` and identified the key docs and folders already present in the repository.

4. **Content synthesis from project docs**  
   - **What I used:** I synthesized the repo’s purpose from `README.md`, `SPEC.md`, and the Copilot instructions.  
   - **Why this feature:** The task asked for a strategy document, which requires transforming source material into a structured narrative. That is different from simply quoting files or listing them.  
   - **What happened:** I turned the repository’s homework-reporting and API constraints into practical guidance for the TOOL_STRATEGY.md sections.

5. **File creation / update workflow**  
   - **What I used:** I prepared the document as a repository file ready to be written into the codebase.  
   - **Why this feature:** The end goal was not just analysis; it was a new Markdown artifact in the repo. A write workflow is the appropriate mechanism because it produces a durable deliverable the team can review and reuse.  
   - **What happened:** I drafted the strategy content in a form suitable for committing as `TOOL_STRATEGY.md`.

6. **Constraint-aware drafting**  
   - **What I used:** I respected the repository’s instruction to prioritize maintainability, correctness, and security, and to avoid inventing unsupported requirements.  
   - **Why this feature:** The case study is not just about generating text; it’s about showing disciplined Copilot use. Constraint-aware drafting is better than freeform generation because it keeps the document aligned with repository guidance.  
   - **What happened:** The resulting strategy focuses on verified repo context and clearly marks where conclusions were inferred from the available docs.

## Scenario Responses

### 1) Understanding a complex 600-line legacy service in an unfamiliar codebase before wiring a new service to it
**Feature to use:** Deep code understanding / multi-file repository analysis.  
I would use a feature that can trace a service across files, dependencies, tests, and data flow so I can understand the behavior before integrating anything new. That is better than a single-file search because the risk is hidden coupling and side effects, which require broader context.

### 2) Generating consistent, standards-compliant request-validation middleware across 10 existing route handlers
**Feature to use:** Code generation with repository context.  
I would use a generation feature that can learn from the existing handlers and reproduce the project’s validation conventions consistently. That is preferable to copying manually because the main challenge is uniformity across multiple handlers, not just writing one validator.

### 3) Quickly verifying whether a JWT verification implementation correctly handles token expiry and signature tampering
**Feature to use:** Targeted code search and code inspection.  
I would use search to jump directly to the JWT verification path, then inspect the checks for expiry, issuer, audience, and signature validation. This is the right feature because the question is narrow and security-sensitive, so I want exact code evidence rather than broad synthesis.

### 4) Enforcing that all commits to main pass linting and test coverage thresholds automatically, with no human intervention
**Feature to use:** GitHub Actions / CI workflow assistance.  
I would use workflow automation because this is a policy-enforcement problem, not a code-writing problem. A CI feature is better than manual review because it can gate merges consistently and remove human discretion from the enforcement path.

### 5) Reviewing a contractor's AI-generated service module for security vulnerabilities before it reaches staging
**Feature to use:** PR review / security-focused code review.  
I would use review assistance because the goal is to assess submitted code for flaws before it lands, not to create it from scratch. That feature is better than plain generation because it emphasizes detection of injection risk, auth issues, unsafe defaults, and missing validation.

### 6) Ensuring Copilot follows multi-tenant data isolation rules consistently across all developers and sessions
**Feature to use:** Repository instructions / policy grounding.  
I would use repository-level instructions so the isolation rule is always present in the assistant’s context. That is better than repeating the rule manually in each prompt because persistent guidance reduces drift and helps enforce consistent behavior across sessions.

## Limitations Encountered

1. **The repository documentation is sparse in some areas**  
   - **Prompted:** I reviewed the README and project spec to build the strategy document.  
   - **What went wrong:** The README is minimal, and the spec is more of a target design than a fully verified implementation record.  
   - **How I detected it:** There were few concrete source files in the inspected material to anchor every scenario directly in code.  
   - **How I fixed it:** I based the document on verified repository guidance and clearly framed some points as strategy rather than implementation fact.  
   - **What I’d do differently:** I’d inspect more source files, tests, and workflow files before finalizing a case-study document.

2. **The visible metadata and repo instructions are not perfectly aligned**  
   - **Prompted:** I compared the repository language composition with the copilot instructions and spec.  
   - **What went wrong:** The repository metadata shows JavaScript, PLpgSQL, and TypeScript, while the copilot instructions describe an ASP.NET Core / .NET 8 architecture.  
   - **How I detected it:** The repo metadata and the instruction file pointed to different implementation signals.  
   - **How I fixed it:** I avoided claiming implementation specifics that were not directly verified and kept the document focused on documented guidance and use cases.  
   - **What I’d do differently:** I’d reconcile the repository’s actual source tree with its instructions before producing a final report.

3. **Direct implementation evidence for some Copilot scenarios was not present**  
   - **Prompted:** I needed to describe how Copilot was used in this case study.  
   - **What went wrong:** The repository does not contain an explicit audit trail of Copilot feature usage, so some entries had to be reconstructed from the available interaction context and repository documents.  
   - **How I detected it:** There was no single file recording all Copilot interactions or decisions.  
   - **How I fixed it:** I wrote the log as a grounded, honest reconstruction and kept the limitations section explicit about where inference was used.  
   - **What I’d do differently:** I’d capture Copilot usage notes during the work session so the final case study could cite concrete observations instead of reconstructed ones.
