# Security

## Reporting a vulnerability

Email **antoine@chessatlas.net** with the subject `SECURITY OpeningScanner`. Please include reproduction steps and, if possible, a proof of concept.

I aim to acknowledge within 72 hours. Please give me a reasonable window to fix before public disclosure.

## Threat model

OpeningScanner has no backend, no account system, no database, and no user-submitted content. The main surfaces to consider:

- **XSS** — we render data pulled from the Lichess and Chess.com public APIs. If a crafted game record could break out of the DOM escaping React provides, that's a bug.
- **SSRF / proxying** — we do not proxy user input. All requests go directly from the browser to the platform APIs. A report claiming server-side SSRF is likely a misunderstanding; please double-check before submitting.
- **Dependency CVEs** — Dependabot is enabled and I generally patch within a week. If a transitive CVE has a known exploit, email me directly.

## What is not in scope

- Social-engineering reports ("your site mentions chess and could be used for phishing").
- Theoretical timing attacks against the browser-only repertoire aggregation.
- Issues in Lichess or Chess.com themselves (report those to the respective platforms).
