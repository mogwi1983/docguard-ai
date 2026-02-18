# DocGuard AI — Spec V2
*Multi-condition rule engine + RAF impact display + VPS deployment*
*Extended from V1 — Feb 18, 2026*

---

## V2 Upgrades Summary

1. **Multi-condition rule engine** — CHF, COPD, CKD, Diabetes (Type 2) alongside MDD
2. **RAF weight impact display** — Current vs potential RAF, dollar impact, color-coded status
3. **VPS deployment** — deploy.sh, nginx config, runs on port 3001

---

## Condition Types & Validation Rules

### MDD (Major Depressive Disorder)
- **Components:** major_keyword, severity, episode_type
- **ICD-10:** F32.0–F33.9 (severity × single/recurrent)
- **RAF:** F33.1 ≈ 0.309; F32.9/F33.9 = 0 (unspecified, no HCC)

### CHF (Congestive Heart Failure)
- **Components:** type (systolic OR diastolic), acuity (acute OR chronic)
- **ICD-10:**
  - I50.21 = Acute systolic
  - I50.22 = Chronic systolic
  - I50.23 = Acute-on-chronic systolic
  - I50.31 = Acute diastolic
  - I50.32 = Chronic diastolic
  - I50.33 = Acute-on-chronic diastolic
  - I50.9 = Unspecified (flag as incomplete)
- **RAF:** I50.22 ≈ 0.368; I50.9 same but flagged

### COPD
- **Components:** severity (GOLD 1-4), exacerbation status
- **Exacerbation:** stable / with exacerbation / with acute lower respiratory infection
- **ICD-10:** J44.0 (acute lower resp), J44.1 (exacerbation), J44.9 (unspecified — flag)
- **RAF:** J44.1 ≈ 0.335; J44.9 = 0 (no HCC)

### CKD (Chronic Kidney Disease)
- **Components:** stage (1, 2, 3a, 3b, 4, 5, or ESRD)
- **ICD-10:** N18.1–N18.6 (stage 1–5 + ESRD); N18.9 = unspecified (flag)
- **RAF:** N18.4/N18.5 ≈ 0.289; N18.6 = 0 (separate ESRD HCC)

### Diabetes (Type 2)
- **Components:** type (Type 2), complication (with/without; if with: nephropathy/retinopathy/neuropathy/peripheral angiopathy/other)
- **ICD-10:** E11.9 (no complications), E11.21 (nephropathy), E11.40 (neuropathy), etc.
- **RAF:** E11.9 = 0; E11.40 ≈ 0.302 (with neuropathy)

---

## RAF Impact Display

- **Current RAF weight** — from detected/suggested ICD-10
- **Potential RAF weight** — if all components documented
- **Dollar impact** — RAF difference × $13,000 (Medicare Advantage PMPY)
- **Status colors:**
  - **Green:** Documentation complete — full RAF value captured
  - **Yellow:** Incomplete documentation may result in lower HCC capture
  - **Red:** Missing components — estimated $X,XXX RAF impact if corrected

---

## Auto-detect Mode

Paste text → system detects condition from keywords:
- MDD, major depressive disorder
- CHF, congestive heart failure, heart failure
- COPD, chronic obstructive pulmonary, emphysema
- CKD, chronic kidney disease, ESRD
- Type 2 diabetes, T2DM, diabetic

Condition selector: Auto-detect | MDD | CHF | COPD | CKD | Diabetes

---

## VPS Deployment

### deploy.sh
```bash
#!/bin/bash
npm run build
pm2 stop docguard-ai 2>/dev/null || true
pm2 start npm --name docguard-ai -- start
pm2 save
```

### nginx (docguard.jamesrodriguez.dev)
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

### Port
- App runs on **port 3001** (3000 used by main dashboard)
- `npm run dev` and `npm run start` both use 3001

---

## Success Criteria (V2)

1. ✅ Paste "Patient has CHF" → detects CHF, flags missing systolic/diastolic and acute/chronic
2. ✅ Shows RAF impact: "Adding specificity could improve documentation quality"
3. ✅ Paste "Major depressive disorder, moderate, recurrent" → all 3 components green, suggests F33.1
4. ✅ Paste a note with T2DM with nephropathy → suggests E11.21, shows HCC weight
5. ✅ Chrome extension auto-detects condition type from pasted text
6. ✅ `npm run build` succeeds, deploy.sh documented in README
