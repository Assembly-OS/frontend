import { test } from "node:test";
import assert from "node:assert/strict";
import uz from "../src/lib/i18n/dictionaries/uz.ts";
import uzc from "../src/lib/i18n/dictionaries/uzc.ts";
import ru from "../src/lib/i18n/dictionaries/ru.ts";
import en from "../src/lib/i18n/dictionaries/en.ts";
import { LEGAL_STATUSES, MEETING_REQUIRED } from "../src/lib/meeting-fields.ts";
import {
  KELISHUV_KINDS,
  KELISHUV_REQUIRED,
  KELISHUV_STATUSES,
} from "../src/lib/kelishuv-fields.ts";
import { PASSPORT_REQUIRED, PHASES, TIERS } from "../src/lib/project-passport.ts";

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

for (const [lang, dict] of Object.entries(DICTIONARIES)) {
  test(`${lang}: every agreement field, kind and status has its words`, () => {
    const keys = [
      ...KELISHUV_REQUIRED.map((field) => `kelishuv.field.${field}`),
      ...KELISHUV_KINDS.map((kind) => `kelishuv.kind.${kind}`),
      // The tabs and the badge: every stored status, "all", and the one that
      // is worked out rather than stored.
      ...[...KELISHUV_STATUSES, "ALL", "EXPIRED"].map((s) => `kelishuv.status.${s}`),
    ];
    for (const key of keys) assert.ok(dict[key]?.trim(), `${lang} is missing ${key}`);
  });
}

for (const [lang, dict] of Object.entries(DICTIONARIES)) {
  test(`${lang}: every passport phase, tier and missing field has its words`, () => {
    const keys = [
      ...PHASES.map((phase) => `proj.phase.${phase}`),
      ...TIERS.map((tier) => `proj.tier.${tier}`),
      ...PASSPORT_REQUIRED.map((field) => `proj.passport.missing.${field}`),
    ];
    for (const key of keys) assert.ok(dict[key]?.trim(), `${lang} is missing ${key}`);
  });
}
