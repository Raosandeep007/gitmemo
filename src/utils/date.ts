import { type Timestamp, timestampDate } from "@bufbuild/protobuf/wkt";

export const toDate = (value: Date | Timestamp | string | number | undefined | null): Date | undefined => {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  if (typeof value === "object" && "seconds" in value && "nanos" in value) {
    return timestampDate(value);
  }

  return undefined;
};
