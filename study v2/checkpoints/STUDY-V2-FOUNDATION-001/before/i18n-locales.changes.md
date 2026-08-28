All three locale files (`i18n/locales/en.js`, `ms.js`, `zh.js`) received the exact
same kind of change: a new `// Study Notes V2 (STUDY-V2-FOUNDATION-001)` block of
`study.*` keys was appended immediately before each file's closing `};`, right
after the pre-existing `'integration.ai': '...'` key (the last key in each file
before this stage). No existing key's value was changed in any of the three files.

Before (identical shape in all three, only the string values differ per language):

```js
  'integration.ai': '<AI assistant, translated>',
};
```

After: the same line, followed by the new `study.*` block, followed by `};`.
