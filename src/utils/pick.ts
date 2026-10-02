//returns a new object with only the allowed keys
//use this instead of passing req.body straight to prisma, otherwise a user can send
//fields like authorId, views or nested writes like { author: { update: { role: "ADMIN" } } }
export const pick = <T extends Record<string, unknown>, K extends string>(
    obj: T,
    keys: readonly K[]
): Partial<Record<K, unknown>> => {
    const result: Partial<Record<K, unknown>> = {};
    for (const key of keys) {
        if (obj && Object.hasOwn(obj, key) && obj[key] !== undefined) {
            result[key] = obj[key];
        }
    }
    return result;
}
