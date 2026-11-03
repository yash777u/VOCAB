# German Vocab Studio

A React vocabulary studio for the Excel workbooks and audio files in this folder. Browse A1–B2 lists, search words and examples, listen to row and sentence audio, save vocabulary, build custom text, and quiz yourself.

## Run

Install [Node.js 18 or newer](https://nodejs.org/) and npm. On Linux or macOS run `bash start.sh`; on Windows run `start.bat`. The first run installs the JavaScript dependencies and starts the app at [http://localhost:5173](http://localhost:5173).

To start manually, run `npm install` once and then `npm run dev`. To create and run a production build, use `npm run build` followed by `npm start`.

## Vocabulary data

The app discovers `.xlsx` workbooks recursively under `A1/`, `A2/`, `B1/`, and `B2/`. It reads the first worksheet and detects German, English, Hindi, and example-sentence columns by their headers. Keep the existing level, workbook, and audio folders in place.

Guests can preview only the first vocabulary row in each workbook. The workbook API enforces this limit and does not send other rows or full sentence tracks until a valid Supabase session is present. Selecting the locked-words row or searching beyond the preview opens the Google sign-in prompt. After sign-in, the workbook reloads with its full contents.

When a saved recording is unavailable in a deployment, the preview speaker requests German text-to-speech audio and falls back to the browser's speech engine if that service is unavailable. The generated speech endpoint accepts short text only. This external fallback may be rate-limited; host the original recordings on a media service for dependable playback at scale.

Numbered audio files are matched to workbook row numbers, for example `single/1_guten Tag.mp3` or `both/1_guten Tag.mp3`. The row audio selector can play the word clip, the combined clip, or both in sequence. Audio files under a `Sentences/` folder are shown as separate full-track players.

The Saved section filters by level and one workbook at a time; it opens on the workbook currently selected in Study. Guest saves remain in this browser and migrate to the signed-in Supabase account. Account saves are synced to the Supabase `public.saved_words` table, keyed by workbook path and row number. The text builder exports selected workbook fields as a `.txt` file.

## Supabase Google sign-in and saved words

This is a Vite/React app, so it uses the Supabase browser client and `VITE_` environment variable names. It does not use the Next.js server, cookies, or middleware examples from Supabase's Next.js guide.

The Supabase project URL and publishable key are in the ignored local `.env.local` file. Copy `.env.example` when configuring another development machine. In Vercel, add these environment variables for Production and Preview, then redeploy:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://npuvulfovyoxoviulooh.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | The project's Supabase publishable key |

In Supabase → Authentication → Providers → Google, enable Google and enter the Google OAuth client ID and secret. In Google Cloud Console, add this authorized redirect URI to the OAuth client:

```text
https://npuvulfovyoxoviulooh.supabase.co/auth/v1/callback
```

In Google Cloud Console, add the app origins `http://localhost:5173` and `https://germanv2.vercel.app`. In Supabase → Authentication → URL Configuration, set the production Site URL to `https://germanv2.vercel.app` and add these Redirect URLs:

```text
http://localhost:5173/**
https://germanv2.vercel.app/**
https://*.vercel.app/**
```

The app's Google sign-in redirects back to the current site origin. Configure the production and preview domains in Supabase's redirect allowlist before testing OAuth.

The saved-words upsert uses the composite key `(user_id, workbook_id, row_index)`. RLS must allow authenticated users to select, insert, update, and delete only their own rows. If you already ran the table SQL from setup but it did not include an update policy, run this once in Supabase → SQL Editor:

```sql
create policy "Users can update their saved words"
on public.saved_words for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
```

Do not add a Google client secret or Supabase service-role key to `.env.local`, Vercel `VITE_` variables, or browser code. The publishable key is intended for browser use when RLS is enabled.

## Project commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the React app and local workbook API |
| `npm run build` | Type-check and create the production bundle in `dist/` |
| `npm test` | Run search, access-control, saved-workbook, and account-menu tests |
| `npm start` | Serve the production build |

The app is implemented with React, Vite, TypeScript, and a small Express API. No Python runtime is required.
