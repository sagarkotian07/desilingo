# Desilingo

Learn India's languages by ear. Hindi, Kannada, Tamil, Telugu, Bengali, Marathi — spoken by [Sarvam AI](https://sarvam.ai) voices, with pronunciation practice that tells you which word slipped.

No signup. No database. Live at **[desilingo-omega.vercel.app](https://desilingo-omega.vercel.app)**.

- 6 languages · 84 lessons + 30 scenes · 684 exercises · 735 clips
- Every language, five units: yes and no, the chai stall, calls and pickups, UPI and deliveries, small talk
- 6 exercise types, including speak-and-be-scored with a word-level diff
- Scenes: a short conversation closes each unit, using what it taught
- Review: missed phrases come back when they're due
- Audio is pre-generated and static — nothing waits on an API
- Phrasebook: "how do you say…" in spoken register

The phrases are how people talk, not how textbooks print. Tamil is *இப்ப வேணாம்*, not *இப்பொழுது வேண்டாம்*.

The Kannada, Tamil, Telugu, Bengali and Marathi courses haven't had a native speaker's review yet. Corrections welcome.

---

## Running it

```bash
npm install
cp .env.example .env.local     # add your Sarvam key
npm run dev
```

**The app works without an API key.** All lesson audio is committed, so a fresh clone plays every clip. A key is only needed for the two live features: pronunciation scoring and the phrasebook — and even those run against a local stand-in with `MOCK_VOICE=1`, so UI work costs nothing.

Get one at [dashboard.sarvam.ai](https://dashboard.sarvam.ai) — signup includes ₹100 of credit, which is more than enough (see *Cost* below).

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm test` | Unit tests — scoring, progress, content invariants |
| `npm run validate:content` | Schema plus the invariants a schema can't express |
| `npm run gen:audio -- --dry-run` | **Print the exact cost before spending anything** |
| `npm run gen:audio` | Generate missing clips (idempotent; skips what exists) |
| `npm run romanize -- --lang hi` | Audit hand-written romanization against Sarvam |
| `MOCK_VOICE=1 npm run dev` | Run with an offline voice stand-in — no key, no spend |
| `npm run verify:audio` | Assert every manifest entry has a file. Runs on `prebuild` |

Live API tests are gated so they never run by accident:

```bash
SARVAM_LIVE=1 npx vitest run tests/integration
```

---

## How it works

### Audio is generated once, not per request

Lesson content is static, so synthesizing at request time means every visitor waits on a paid API call for a phrase that never changes. `scripts/generate-audio.ts` synthesizes each clip once and writes it to `public/audio/<lang>/<hash>.mp3`, committed to the repo. Playback is a static CDN fetch: instant, free, and working with no key at all.

Filenames are a hash of the whole tuple — language, text, speaker, model, pace — so changing a voice produces new files rather than silently serving the old one forever.

`/api/tts` exists only as a repair path for a missing file. It takes a **manifest key, never free text**, so it cannot be turned into a general-purpose text-to-speech API billed to your account.

### Pronunciation scoring

Record → `/api/stt` → Sarvam `saaras:v4` → normalize → align → verdict.

The route takes the phrase's **content-addressed key**, never the text. The server resolves it against the manifest, so the set of phrases a caller can make us pay to score is exactly the set we ship — the same allowlist trick `/api/tts` uses. It also reads the duration from the WAV header rather than trusting byte count, because Sarvam bills by the second and accepts up to 30 s.

The interesting part is the metric. Comparison uses a **weighted edit distance over grapheme clusters**, with:

- **Normalization** that strips the danda Sarvam appends, folds native digits, and removes ZWJ/ZWNJ.
- **Orthographic folding** so हिन्दी and हिंदी are the same word — both are correct standard spellings, and treating them as different tells a learner who was right that they were wrong.
- **Substitution costs** reflecting real confusions: aspiration 0.4, retroflex↔dental 0.5, voicing 0.6. These are the pairs Sarvam's own STT mixes up, so charging full price punishes the learner for the model's error.
- **Weighted insertions and deletions**, because losing a nasalization mark is a small slip while swapping a consonant is a different word.
- **Word-level alignment**, so the UI can say *which* word came out wrong instead of showing 0.62.

Thresholds lean forgiving, and a speaking exercise **never blocks progress**. False negatives are the expensive failure: a learner told they're wrong when they weren't concludes the app is broken. "We couldn't hear you" and "that sounded like English" are separate verdicts from "incorrect", and the raw transcript is always shown so a model error is visible as a model error.

### Review remembers what you missed

Every answer updates a per-phrase record in `localStorage`, on a Leitner ladder of boxes 0–6. Right moves a phrase up and waits longer (1, 2, 4 … 32 days); wrong or skipped drops it to 0, due tomorrow. One promotion a day at most, so a lesson that shows a phrase three times can't bury it for a month.

A failed pronunciation attempt and a slip in match-pairs count as *seen*, not wrong: the first is as often the speech model or a muted mic, and the second can't say which pair. When something is due, Home shows a Review card: up to five phrases, rebuilt from exercises already met, never speaking or typing.

Why not SM-2: it wants a 0–5 grade per answer, and five of the six exercise types can honestly give only right or wrong.

### Cost

Real numbers from building this:

| | |
|---|---|
| All 735 clips, 6 languages | **₹30.78**, one-time |
| One pronunciation attempt | ~₹0.03 |
| Repeat visitor | **₹0** — static files |

Slow-pace audio is generated only for speaking drills, not every phrase, which roughly halves the bill for no pedagogical loss.

### Not leaving the door open

A public deployment proxying a personal API key is a way for a stranger to spend your credits. In order of importance:

1. `/api/tts` accepts a manifest key, not text.
2. `/api/stt` requires a parseable `Content-Length` and rejects oversized uploads **before** reading the body. A missing or chunked header must be refused, not treated as zero — Vercel's own limit is 100 MB and will not save you.
3. A Vercel WAF rate-limit rule on `/api/stt` is the load-bearing control; requests it blocks never reach a function.
4. Per-IP throttling in-process as defence in depth — honestly imperfect, since counters are per instance.
5. `SARVAM_ENABLED=0` as a kill switch.

Being straight about it: no unauthenticated public endpoint that spends money can be made fully safe. Keeping the account balance small is the only real guarantee.

---

## Deploying

```bash
vercel
vercel env add SARVAM_API_KEY production
```

`vercel.ts` pins the region to `bom1`. The default is Washington, and Sarvam's API is in India — every pronunciation attempt would otherwise cross the Pacific twice. It also marks `/audio/*` immutable, since Next only long-caches `/_next/static` by default and the filenames are content hashes.

Add the rate-limit rule once:

```bash
vercel firewall rules add "Limit STT" \
  --condition '{"type":"path","op":"pre","value":"/api/stt"}' \
  --action rate_limit --rate-limit-window 60 --rate-limit-requests 12 \
  --rate-limit-keys ip --yes
vercel firewall publish --yes
```

Rules are staged until published. Set `MOCK_VOICE=1` for Preview so preview deploys never spend credits.

**Never run `gen:audio` in CI or the Vercel build** — every preview deploy would re-spend credits. Generation is local and deliberate; `verify:audio` runs on `prebuild` instead and makes no API calls.

---

## Adding a language

1. Write `src/content/<lang>.json` against the schema in `src/content/schema.ts`.
2. Register it in `src/content/index.ts` (one line).
3. `npm run validate:content`
4. `npm run gen:audio -- --lang <lang> --dry-run`, then without `--dry-run`.
5. Commit the MP3s.

A unit can end with a scene: a lesson with `scene: { setting, other }` whose turns carry the other speaker's line as `lead`. The schema enforces the rest (turn types, one per unit, last in it).

Sarvam's TTS covers 11 Indian languages, so Gujarati, Malayalam, Odia and Punjabi are all available. Its STT covers 23 — you can transcribe more than you can synthesize, so plan around the TTS list.

## Adding an exercise type

Add it to the discriminated union in `src/content/schema.ts`, write the component in `src/components/exercises/`, and add a case to `ExerciseView` in `ExerciseRunner.tsx`. TypeScript will point at anything you missed.

---

## Notes on the Sarvam API

Several field names in circulation are out of date. Current as of `bulbul:v3` / `saaras:v4`:

- TTS takes **`language_code`**, not `target_language_code`.
- The STT model family is **`saaras`**. `saarika` no longer exists.
- `pitch`, `loudness` and `enable_preprocessing` are v2-only and **silently ignored** on `bulbul:v3`. Use `temperature`.
- Auth is `api-subscription-key`, and a bad key returns **403**, not 401.
- Translation's `modern-colloquial` mode substitutes English loanwords transliterated into the native script — "the nearest railway station" comes back as *नियरेस्ट रेलवे स्टेशन*. This app uses **`classic-colloquial`**, which is spoken register with real words.

## Acknowledgements

The idea, and the shape of the lesson flow, come from [`03shraddha/indian-duolingo`](https://github.com/03shraddha/indian-duolingo). This is an independent rebuild.

## License

MIT — see [LICENSE](LICENSE).
