# DocGuard AI

**Real-time clinical documentation validator** — Chrome extension + web app. Validates MDD (Major Depressive Disorder), CHF (Congestive Heart Failure), and Opioid Dependence/SUD. Flags missing documentation components before the note is locked.

## Quick Start (2-Minute Demo)

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment**
   ```bash
   cp .env.example .env
   # Add your OPENAI_API_KEY (optional — regex fallback works without it)
   ```

3. **Run the web app**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

4. **Paste & Analyze**
   - Select condition: MDD | CHF | Opioid/SUD | Auto-detect
   - Paste a clinical note (e.g. `Patient has major depressive disorder, moderate severity`)
   - Click **Analyze**
   - See component checklist with ✅/❌ and suggested diagnosis with ICD-10 code

5. **Chrome Extension (optional)**
   - Go to `chrome://extensions`
   - Enable "Developer mode" → "Load unpacked" → select `extension/` folder
   - Navigate to any page with a textarea (or EHR), type a note
   - Press **Ctrl+Shift+D** (or Cmd+Shift+D on Mac) to analyze
   - Floating panel shows validation; updates as you type (500ms debounce)

## Architecture

| Component | Description |
|-----------|-------------|
| **Next.js 14 app** | Landing page + paste-and-analyze UI, dark navy theme |
| **`/api/analyze`** | GPT-4o for MDD; regex for CHF and Opioid/SUD |
| **Chrome extension** | Manifest V3, reads textarea content, floating sidebar (auto-detects condition) |
| **Rule engines** | MDD, CHF, and SUD validation rules |

## Condition Validation

### MDD (Major Depressive Disorder)
- **"Major" keyword** — "major depressive disorder" or "MDD"
- **Severity** — mild / moderate / severe (with or without psychotic features)
- **Episode type** — single episode OR recurrent
- ICD-10: F32.0, F33.1, F32.3, etc.

### CHF (Congestive Heart Failure)
- **Type** — systolic (EF &lt; 50%) vs diastolic (EF ≥ 50%) vs combined
- **Acuity** — acute / chronic / acute-on-chronic
- ICD-10: I50.21–I50.43. Compensated CHF ≠ resolved — document as chronic.

### Opioid Dependence / SUD
- **Substance** — opioid, alcohol, cannabis, stimulant
- **Severity** — dependence (F11.20) vs abuse (F11.10) vs unspecified
- **Remission** — F11.21 for MAT / in remission
- Physiologic dependence ≠ addiction — stable chronic opioid therapy = F11.20.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key for GPT-4o analysis (optional; regex used if missing) |
| `NEXT_PUBLIC_APP_URL` | App URL for extension (default: localhost:3000) |

## File Structure

```
docguard-ai/
├── app/
│   ├── page.tsx
│   ├── layout.tsx
│   ├── globals.css
│   └── api/analyze/route.ts
├── components/
│   ├── NoteAnalyzer.tsx
│   ├── ValidationPanel.tsx
│   └── SuggestionCard.tsx
├── lib/
│   ├── mddRules.ts
│   ├── chfRules.ts
│   ├── sudRules.ts
│   └── analyzeNote.ts
├── types/
│   └── validation.ts
├── extension/
│   ├── manifest.json
│   ├── content.js
│   ├── sidebar.html (inline in content.js)
│   └── background.js
├── .env.example
└── README.md
```

## License

MIT
