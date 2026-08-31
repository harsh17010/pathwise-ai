# Pathwise AI — Local-Only Submission and Demo Guide

## 1. Local setup for evaluators

The deployed-application field can be left blank or filled with `N/A — local setup provided.` The evaluator should run the project locally.

### Requirements

Use Node.js 22 or newer and pnpm. No login is required for the core demo flow. The project includes deterministic fallback behavior, so the roadmap can still be demonstrated when optional hosted AI or database environment variables are unavailable.

### Commands

From the project root, run:

```bash
pnpm install
pnpm check
pnpm test
pnpm dev
```

Open the address printed by the development server. The expected local address is:

```text
http://localhost:3000
```

For the no-login evaluator demo, open the application and use **Profile** to enter the learner goal. The optional database migration command should only be run when a valid `DATABASE_URL` is available:

```bash
pnpm db:push
```

Do not commit `.env` files, credentials, `node_modules`, build output, or the raw CSV dataset.

## 2. Recommended demo profile

Use one consistent learner throughout the recording:

> I want to become a job-ready data analyst in 12 weeks. I know Excel and can study six hours each week. I learn best by doing projects.

Confirm **Beginner**, **Excel**, **12 weeks**, **6 hours per week**, and **Hands-on course + Project**.

## 3. Four-minute recording plan

| Time | Action | Narration cue |
|---|---|---|
| 0:00–0:25 | Show Overview | Explain that Pathwise turns a learner’s intention into an inspectable learning path rather than showing an undifferentiated course list. |
| 0:25–1:05 | Open Profile and use the guided interview | Enter the learner goal. Answer the level, skills, weekly availability, timeline, and preferred-format questions. Emphasize that the profile remains editable. |
| 1:05–1:20 | Confirm the brief | Show the confirmation summary and click **Confirm & create route**. Explain that the confirmed profile is handed to the deterministic roadmap generator. |
| 1:20–2:00 | Show My Path | Point out the target capability, estimated effort, milestones, prerequisite-aware order, course facts, and each **Why this now** explanation. |
| 2:00–2:35 | Demonstrate adaptation | Complete one item, defer or skip another, and choose a rating such as **Too difficult**, **Not relevant**, or **Prefer hands-on**. Show the explanation describing how the future sequence changes. |
| 2:35–3:05 | Show Skills | Explain that the view shows skill gaps and progress evidence; completion is not presented as automatic proof of mastery. |
| 3:05–3:40 | Ask the Assistant | Ask: `Why is the next item scheduled before the project?` Highlight that the answer is grounded in the current roadmap and catalog facts. |
| 3:40–4:00 | Close on Overview | Summarize: Pathwise is personalized, explainable, prerequisite-aware, and adaptive, with a local setup for evaluation. |

## 4. How to record

Use OBS Studio, Loom, Clipchamp, QuickTime screen recording, or any available screen recorder. Record at 1280×720 or 1440×900, keep browser zoom at 100%, and record only the application window. Hide personal credentials and terminal paths. Keep the final video between three and five minutes.

After recording, upload the video as **Unlisted** on YouTube or use the equivalent share setting on another video host. Copy the share URL into the demo-video field. Play the shared URL once in a private/incognito window before submitting it.

## 5. Submission form mapping

| Form field | What to provide |
|---|---|
| Source code (ZIP) | `dist/Pathwise-AI-source.zip` from the project package. |
| Source code repository | The evaluator-accessible GitHub repository URL. This field remains required even though application deployment is omitted. |
| Solution documentation | `docs/solution-documentation/main.pdf`. |
| Demo video URL | The unlisted YouTube or equivalent share URL for the 3–5 minute recording. |
| Deployed application URL | `N/A — local setup provided.` or leave blank if the form permits it. |
| Local setup & execution instructions | Paste the setup section from this document, or provide the repository’s `README.md` and this guide. |

The competition deadline shown in the team submission form is **31 August 2026, 11:59 pm IST**. Submit only after confirming that the ZIP opens, the PDF renders, the video link is accessible, and the local command sequence reaches `http://localhost:3000`.

## 6. Final smoke test before submission

Run `pnpm check`, `pnpm test`, and `pnpm dev`. In the browser, complete the guided interview, confirm the learner brief, generate a roadmap, inspect a rationale, change an item’s status, submit a rating, open Skills, and ask the Assistant one grounded question. Finally, test the local URL in a fresh browser window.

## References

[1]: https://nodejs.org/ Node.js official website
[2]: https://pnpm.io/ pnpm official documentation
[3]: https://obsproject.com/ OBS Studio official website
[4]: https://support.google.com/youtube/answer/157177 YouTube visibility settings documentation
``` 
