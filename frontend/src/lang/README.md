# Translations

Arbour ships with translations for 30+ languages. All translation files live in this directory as `<lang-code>.ts` files.

## Adding or Improving a Translation

1. Find your language file (e.g. `de.ts` for German, `zh-TW.ts` for Traditional Chinese).
2. Copy any missing keys from `en.ts` and translate the values.
3. Open a pull request with your changes.

If your language does not have a file yet:

1. Copy `en.ts` to a new file named with the [BCP 47 language tag](https://en.wikipedia.org/wiki/IETF_language_tag) (e.g. `fi.ts` for Finnish).
2. Translate all values.
3. Add your language to the `languageList` in `frontend/src/i18n.ts`:
   ```ts
   "fi": "Suomi"
   ```
4. Open a pull request.

## Notes

- Only translate the **values**, never the keys.
- Use `{0}`, `{1}`, etc. as placeholders where you see them in `en.ts` — keep them in the translation.
- The English file (`en.ts`) is the source of truth. When new strings are added there, other languages will fall back to English until translated.
