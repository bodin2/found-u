/** Remove undefined values so Firestore addDoc/setDoc does not throw. */
export function stripUndefined<T>(value: T): any {
  if (value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as T;
  }

  if (value !== null && typeof value === "object" && !(value instanceof Date)) {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (nested !== undefined) {
        result[key] = stripUndefined(nested);
      }
    }
    return result as T;
  }

  return value;
}
