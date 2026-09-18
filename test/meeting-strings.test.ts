import { test } from "node:test";
import assert from "node:assert/strict";
import uz from "../src/lib/i18n/dictionaries/uz.ts";
import uzc from "../src/lib/i18n/dictionaries/uzc.ts";
import ru from "../src/lib/i18n/dictionaries/ru.ts";
import en from "../src/lib/i18n/dictionaries/en.ts";
import { LEGAL_STATUSES, MEETING_REQUIRED } from "../src/lib/meeting-fields.ts";

/**
 * The meeting page names what a record is missing by building keys at run
 * time — `meeting.field.${field}` — and casts them past the compiler, which
 * therefore cannot see a field added to MEETING_REQUIRED without its label.
 * On screen that is a raw key in the "not recorded" list. Same for the legal
 * status badge.
 */

const DICTIONARIES = { uz, uzc, ru, en } as Record<string, Record<string, string>>;

for (const [lang, dict] of Object.entries(DICTIONARIES)) {
  test(`${lang}: every required meeting field has a label`, () => {
    for (const field of MEETING_REQUIRED) {
      const key = `meeting.field.${field}`;
      assert.ok(dict[key]?.trim(), `${lang} is missing ${key}`);
    }
  });

  test(`${lang}: every legal status has a name`, () => {
    for (const status of LEGAL_STATUSES) {
      const key = `meeting.legal.${status}`;
      assert.ok(dict[key]?.trim(), `${lang} is missing ${key}`);
    }
  });
}
