import { Temporal } from "temporal-polyfill";
import * as v from "valibot";

/** wire 형식(응답/문서). transform이 없다. */
export const IsoInstant = v.pipe(v.string(), v.isoTimestamp());

/** 경계에서 parse할 때 쓴다: ISO 문자열 → Temporal.Instant */
export const InstantFromIso = v.pipe(
  IsoInstant,
  v.transform((s) => Temporal.Instant.from(s)),
);

/**
 * 저장·응답용 직렬화. 밀리초 3자리로 고정한다.
 * 자릿수가 섞이면 ISO 문자열 정렬이 깨진다("…05.235Z" < "…05Z").
 */
export const toIsoMillis = (instant: Temporal.Instant): string =>
  instant.toString({ fractionalSecondDigits: 3 });
