# DocGuard AI

**Real-time clinical documentation validator** — Chrome extension + web app. MDD (Major Depressive Disorder) MVP. Flags missing documentation components before the note is locked.

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
   - Paste: `Patient has major depressive disorder, moderate severity`
   - Click **Analyze**
   - See: ✅ Major keyword, ✅ Severity, ❌ Episode type
   - Copy the suggested diagnosis with ICD-10 code

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
| **`/api/analyze`** | GPT-4o integration with regex fallback for MDD validation |
| **Chrome extension** | Manifest V3, reads textarea content, floating sidebar |
| **MDD rules** | 3 components: "major" keyword, severity, episode type |

## MDD Validation

Required components:
1. **"Major" keyword** — "major depressive disorder" or "MDD"
2. **Severity** — mild / moderate / severe (with or without psychotic features)
3. **Episode type** — single episode OR recurrent

ICD-10 examples: F32.0 (mild single), F33.1 (moderate recurrent), F32.3 (severe w/ psychosis single).

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
