# DocGuard AI

**Real-time clinical documentation validator** — Chrome extension + web app. Multi-condition rule engine (MDD, CHF, COPD, CKD, Diabetes). Flags missing documentation components before the note is locked. Shows RAF impact and dollar estimates.

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
   Open [http://localhost:3001](http://localhost:3001)

4. **Paste & Analyze**
   - Select condition: **Auto-detect** (or MDD | CHF | COPD | CKD | Diabetes)
   - Paste: `Patient has CHF` or `Major depressive disorder, moderate, recurrent`
   - Click **Analyze**
   - See component checklist, suggested ICD-10, and **RAF Impact** (current vs potential weight, $ impact)

5. **Chrome Extension (optional)**
   - Go to `chrome://extensions`
   - Enable "Developer mode" → "Load unpacked" → select `extension/` folder
   - Extension auto-detects condition from pasted text
   - Press **Ctrl+Shift+D** (or Cmd+Shift+D on Mac) to analyze
   - Floating panel shows validation + RAF impact; updates as you type (500ms debounce)
   - Extension connects to `localhost:3001` (for production VPS, update `API_URL` in `extension/content.js`)

## Architecture (V2)

| Component | Description |
|-----------|-------------|
| **Next.js 14 app** | Landing page + paste-and-analyze UI, dark navy theme |
| **`/api/analyze`** | Multi-condition validation: MDD, CHF, COPD, CKD, Diabetes |
| **Rule engine** | `lib/validationRules.ts` — regex-based validation with ICD-10 mapping |
| **RAF display** | Current vs potential RAF weight, $13K PMPY impact estimate |
| **Chrome extension** | Manifest V3, condition auto-detect, floating sidebar |

## Condition Types

| Condition | Required Components | ICD-10 Examples |
|-----------|---------------------|-----------------|
| **MDD** | major keyword, severity, episode type | F33.1 (moderate recurrent) |
| **CHF** | type (systolic/diastolic), acuity (acute/chronic) | I50.22 (chronic systolic) |
| **COPD** | severity (GOLD 1-4), exacerbation status | J44.1 (with exacerbation) |
| **CKD** | stage (1–5, ESRD) | N18.4 (Stage 4) |
| **Diabetes (T2)** | type 2, complication (with/without + type) | E11.21 (nephropathy) |

## RAF Impact

- **Green:** Documentation complete — full RAF value captured
- **Yellow:** Incomplete documentation may result in lower HCC capture
- **Red:** Missing components — estimated $X,XXX RAF impact if corrected

Uses approximate 2024 HCC RAF weights; Medicare Advantage PMPY ≈ $13,000.

## VPS Deployment

**VPS:** 31.97.103.33 | **Domain:** docguard.jamesrodriguez.dev

1. **Deploy script**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```
   This runs `npm run build`, then `pm2 start` on port 3001.

2. **Nginx config** — see `nginx.conf.example`:
   ```nginx
   server {
       listen 80;
       server_name docguard.jamesrodriguez.dev;
       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. **Port 3001** — App runs on 3001 (3000 used by main dashboard). Both `npm run dev` and `npm run start` use 3001.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key for GPT-4o analysis (optional; regex used if missing) |
| `NEXT_PUBLIC_APP_URL` | App URL for extension (default: localhost:3001) |

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
│   ├── validationRules.ts   # Multi-condition rule engine
│   ├── mddRules.ts         # Re-exports for MDD
│   └── analyzeNote.ts
├── types/
│   └── validation.ts
├── extension/
│   ├── manifest.json
│   ├── content.js          # Condition auto-detect
│   └── background.js
├── deploy.sh               # VPS deploy script
├── nginx.conf.example      # Nginx config for docguard.jamesrodriguez.dev
├── SPEC_V1.md
├── SPEC_V2.md
└── README.md
```

## Spec

- **SPEC_V1.md** — Original MDD MVP
- **SPEC_V2.md** — Multi-condition, RAF impact, VPS deployment

## License

MIT
