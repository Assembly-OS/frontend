import { test } from "node:test";
import assert from "node:assert/strict";
import uz from "../src/lib/i18n/dictionaries/uz.ts";
import uzc from "../src/lib/i18n/dictionaries/uzc.ts";
import ru from "../src/lib/i18n/dictionaries/ru.ts";
import en from "../src/lib/i18n/dictionaries/en.ts";
import { METRICS } from "../src/lib/metrics.ts";

/**
 * The metric chip builds its keys at run time — `metric.scope.${scope}` — and
 * casts them to `MessageKey`. That cast is what lets the compiler through, and
 * it is also why the compiler cannot notice a missing translation: a scope
 * added to the registry without its four strings renders the raw key on the
 * dashboard, which reads as a bug in the app. This is the check the cast
 * switched off.
 */

const DICTIONARIES = { uz, uzc, ru, en } as Record<
  string,
  Record<string, string>
>;

const scopes = new Set(Object.values(METRICS).map((m) => m.scope));
const bases = new Set(Object.values(METRICS).map((m) => m.basis));

for (const [lang, dict] of Object.entries(DICTIONARIES)) {
  test(`${lang}: every scope a figure can carry has its label`, () => {
    for (const scope of scopes) {
      const key = `metric.scope.${scope}`;
      assert.ok(dict[key]?.trim(), `${lang} is missing ${key}`);
    }
  });

  test(`${lang}: every basis a figure can carry has its explanation`, () => {
    for (const basis of bases) {
      const key = `metric.basis.${basis}`;
      assert.ok(dict[key]?.trim(), `${lang} is missing ${key}`);
    }
  });
}

test("the four dictionaries carry the same keys", () => {
  // The build enforces this through `typeof uz`, but only for keys the code
  // names literally. Checked here too so this file fails on its own terms.
  const reference = Object.keys(uz).sort();
  for (const [lang, dict] of Object.entries(DICTIONARIES)) {
    assert.deepEqual(Object.keys(dict).sort(), reference, `${lang} differs`);
  }
});
