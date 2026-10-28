# Rosie's Dutch 🇳🇱

A Duolingo-style app for learning Dutch (English → Dutch, with Vietnamese help),
following the **Start.NL** books 1 and 2.

**Live app:** https://clickbait-cs.github.io/rosies-dutch-app/

## What's inside

| Folder / file | What it is |
|---|---|
| `src/content/chapters/*.json` | **All lesson content.** One file per chapter: words, sentences, verbs, grammar, in English + Vietnamese. Edit these to change lessons. |
| `src/content/tips.json` | Explanations of things that are hard for Vietnamese speakers (de/het, word order, …). |
| `src/lib/` | The logic: building exercises, checking answers, spaced repetition, streaks, syncing. |
| `src/screens/` | The pages of the app (home, lesson, review, settings, supporter…). |
| `src/exercises/` | The exercise types (multiple choice, match, word tiles, typing, speaking). |
| `src/config.ts` | Which account is the learner and which is the supporter. |
| `firestore.rules` | Database security rules (pasted into the Firebase console). |
| `.github/workflows/deploy.yml` | Builds and publishes the app on every push to `main`. |

Chapters marked `"provisional": true` have a theme that still needs to be checked
against the table of contents of the book.

## Changing content

1. Open a chapter file in `src/content/chapters/`, e.g. on GitHub, and click the ✏️ pencil.
2. Change or add a word, for example
   `{ "nl": "fiets", "article": "de", "plural": "fietsen", "en": "bicycle", "vi": "xe đạp" }`
3. Commit. GitHub checks the content (`npm test`) and publishes the app in about 2 minutes.
   If something is wrong, the Actions tab shows a red ❌ and the old version stays online.

## Running it on a computer (optional)

```bash
npm install
npm run dev     # opens on http://localhost:5173/rosies-dutch-app/
npm test        # checks logic and content
```

Built with React, TypeScript, Tailwind CSS, Vite and Firebase.
