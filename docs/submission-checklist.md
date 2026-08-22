# Pathwise AI Submission Checklist

## Required deliverables

| Deliverable | Path or action | Final check |
|---|---|---|
| Source-code ZIP | `dist/Pathwise-AI-source.zip` after running the packaging command below. | Confirm `node_modules`, `dist` build output, raw CSV files, and secrets are excluded. |
| GitHub repository | Create via the project management interface or push the initialized repository. | Confirm evaluator access and readable feature-oriented commit history. |
| Solution documentation | `docs/solution-documentation/main.pdf` | Confirm the PDF explains the problem, approach, architecture, AI/ML, workflows, features, challenges, and limitations. |
| Demo video | Record using `docs/demo-script.md`. | Confirm duration is 3–5 minutes and the complete core workflow is visible. |
| Application access | Publish from the project interface after the final checkpoint. | Test the public URL in a fresh browser session. |

## Source archive command

Run the command from the project root after final validation:

```bash
mkdir -p dist
zip -r dist/Pathwise-AI-source.zip . \
  -x "node_modules/*" "dist/*" ".git/*" ".manus-logs/*" \
  -x "*.csv" "*.zip" ".env" ".env.*" "docs/solution-documentation/main.pdf"
```

The raw data remains outside the project repository by design. Include only the reproducible `scripts/buildCatalog.mjs` transformation and the compact generated catalog if contest rules permit it. The source archive should include this README, tests, docs, migration, and fallback catalog.

## Pre-submission smoke test

Run `pnpm check` and `pnpm test`. Open the web application and demonstrate this exact flow: set goal, review the editable profile, generate the roadmap, inspect a rationale, complete a step, submit feedback, observe the adaptation explanation, open Skills, and ask the assistant a grounded question. Finally, verify the mobile layout and the deployed URL.
