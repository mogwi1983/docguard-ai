# DocGuard AI — Spec V1 (Updated)
*MDD, CHF, Opioid/SUD — Real-time clinical documentation validator*
*Authored by Samantha · Feb 17, 2026 · Updated with CHF and Opioid Dependence/SUD*

---

## The Problem
Medicare Advantage clinicians document diagnoses that are later flagged by documentation teams (e.g. DataRaps at WellMed) for missing specificity components — often days after the note is locked. The fix requires addendums or patient callbacks. It's slow, expensive, and avoidable.

**Example — MDD:**
A complete MDD diagnosis requires 3 components:
1. The word "major" (not just "depression")
2. Severity (mild / moderate / severe)
3. Episode type (single episode / recurrent)

If any component is missing, the diagnosis won't capture the HCC properly.

---

## The Solution — DocGuard AI
A Chrome extension + lightweight web app that reads the clinician's note in real time and flags missing documentation components **before the note is locked**.

**Scope:** MDD, CHF, and Opioid Dependence/SUD documentation validation.
**Tech stack:** Chrome extension (Manifest V3) + Next.js 14 web app + OpenAI GPT-4o for MDD; regex for CHF and SUD.

---

## Architecture

### Component 1: Chrome Extension (Manifest V3)
- Runs as a content script on any EHR webpage (Epic, eClinicalWorks, Athena, etc.)
- Reads visible text in the active textarea/editor using a MutationObserver
- Debounces input (500ms) then sends note text to the local/hosted API
- Renders a floating sidebar panel showing validation results inline
- No EMR integration required — works as an overlay on any web-based EHR

### Component 2: Next.js Web App
- Landing page explaining DocGuard AI
- Paste-and-analyze mode (for demos, no Chrome extension needed)
- `/api/analyze` endpoint that accepts note text + returns validation results
- Built on raf-buddy's existing UI architecture (TypeScript, Tailwind, dark navy theme)
- Auth: simple password or Firebase (can start with no auth for MVP)

### Component 3: Analysis Engine (`/api/analyze`)
Input: `{ noteText: string, conditionType: "mdd" | "chf" | "opioid_sud" | "auto" }`

Output:
```json
{
  "conditionType": "mdd",
  "detected": true,
  "valid": false,
  "missingComponents": ["severity", "episode_type"],
  "presentComponents": ["major_keyword"],
  "suggestedText": "Major Depressive Disorder, moderate severity, recurrent episode",
  "icd10": "F33.1",
  "explanation": "MDD requires 3 components: (1) 'major' keyword ✅ (2) severity — missing ❌ (3) single/recurrent — missing ❌",
  "rafImpact": "high"
}
```

**Analysis logic:**
- Use GPT-4o with a carefully crafted system prompt for MDD validation
- System prompt includes: DSM-5 MDD criteria, required documentation components, ICD-10 mapping table
- Fallback: regex-based rule engine for offline/demo mode

---

## MDD Validation Rules

### Required components:
1. **"Major" keyword** — must contain "major depressive disorder" or "MDD"
   - ❌ "depression", "depressive disorder" = incomplete
   - ✅ "major depressive disorder", "MDD" = complete

2. **Severity** — must specify one of:
   - mild / moderate / severe (with or without psychotic features)
   - If unspecified → flag as missing

3. **Episode type** — must specify:
   - "single episode" OR "recurrent"
   - If unspecified → flag as missing

### ICD-10 mapping:
| Severity | Single Episode | Recurrent |
|---|---|---|
| Mild | F32.0 | F33.0 |
| Moderate | F32.1 | F33.1 |
| Severe w/o psychosis | F32.2 | F33.2 |
| Severe w/ psychosis | F32.3 | F33.3 |
| Unspecified | F32.9 | F33.9 |

---

## UI/UX

### Web App — Paste & Analyze Mode
- Text area: paste clinical note
- "Analyze" button → calls /api/analyze
- Results panel: green checkmarks for present components, red X for missing
- Suggested complete diagnosis string (copy with one click)
- ICD-10 code auto-selected based on components found

### Chrome Extension — Floating Panel
- Triggered by: keyboard shortcut (Ctrl+Shift+D) or clicking extension icon
- Reads active textarea content automatically
- Shows compact validation panel: 3 component checklist for MDD
- Updates in real time as clinician types (debounced 500ms)
- Dismissable overlay, doesn't interfere with EHR workflow

---

## File Structure
```
docguard-ai/
├── app/                          # Next.js web app
│   ├── page.tsx                  # Landing/demo page
│   ├── api/
│   │   └── analyze/route.ts      # Analysis API endpoint
│   └── globals.css
├── components/
│   ├── NoteAnalyzer.tsx          # Main paste-and-analyze UI (adapted from raf-buddy)
│   ├── ValidationPanel.tsx       # Component checklist display
│   └── SuggestionCard.tsx        # Suggested diagnosis + ICD-10
├── lib/
│   ├── mddRules.ts               # MDD validation rule engine (regex fallback)
│   └── analyzeNote.ts            # OpenAI GPT-4o integration
├── extension/                    # Chrome extension
│   ├── manifest.json             # Manifest V3
│   ├── content.js                # Content script (reads EHR text)
│   ├── sidebar.html              # Floating panel HTML
│   ├── sidebar.js                # Panel logic
│   └── background.js             # Service worker
├── types/
│   └── validation.ts             # TypeScript types
├── .env.example
├── package.json
└── README.md
```

---

## MVP Success Criteria
1. Paste a clinical note with "major depressive disorder, moderate" → correctly identifies missing "single episode / recurrent"
2. Suggests complete diagnosis string: "Major Depressive Disorder, moderate severity, recurrent episode (F33.1)"
3. Chrome extension reads text from a textarea and shows the same validation
4. Demo-able in 2 minutes to a non-technical audience

---

## Design
- Dark navy theme (consistent with jamesrodriguez.dev)
- Clean, clinical aesthetic — not gimmicky
- Mobile-responsive web app
- Chrome extension panel: compact, dismissable, non-intrusive

---

## Environment Variables
```
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_APP_URL=https://docguard.ai (or localhost:3000)
```

---

## CHF Validation (Added)
- **Type:** systolic (EF &lt; 50%) | diastolic (EF ≥ 50%) | combined
- **Acuity:** acute | chronic | acute-on-chronic
- ICD-10: I50.21–I50.43
- Key insight: Compensated CHF ≠ resolved. Document as chronic.

## Opioid Dependence / SUD Validation (Added)
- **F11.20** — Opioid dependence, uncomplicated (chronic opioid therapy, physiologic dependence)
- **F11.21** — Opioid dependence, in remission (MAT: buprenorphine, naltrexone, methadone)
- **F11.10** — Opioid abuse; **F11.90** — Unspecified
- Key insight: Physiologic dependence ≠ addiction.

## Future Expansion (post-MVP)
- COPD (severity + exacerbation), CKD (stage), Diabetes (type + complication)
- HCC capture scoring: show RAF weight impact of adding missing components
- Multi-condition note scanning: analyze entire note, surface all documentation gaps
- Team dashboard: aggregate documentation quality metrics across providers
- Potential SaaS: $50-100/provider/month, no EMR contract needed

---

## Portfolio Value
- Demonstrates clinical domain expertise (knows the documentation rules)
- Demonstrates technical execution (Chrome extension + AI API + web app)
- Directly relevant to every healthcare AI company James is targeting
- Live demo at: docguard.jamesrodriguez.dev (or separate domain)

---

## Cursor Instructions
Build the complete MVP as described. Start with:
1. Next.js 14 app (TypeScript, Tailwind, dark navy theme matching jamesrodriguez.dev)
2. `/api/analyze` endpoint with GPT-4o integration AND regex fallback for MDD
3. NoteAnalyzer component with paste + analyze UI (adapt from raf-buddy's NoteAnalysisPage.tsx pattern)
4. ValidationPanel showing 3-component checklist with green/red indicators
5. Chrome extension (Manifest V3) that reads textarea content and shows floating sidebar
6. Full README with setup instructions

Use the existing raf-buddy architecture as inspiration but build fresh in the new docguard-ai repo.
