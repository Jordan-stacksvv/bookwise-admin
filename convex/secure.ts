import { mutation as rawMutation, query as rawQuery } from "./_generated/server";
import { requireApproved } from "./access";

/**
 * Drop-in replacements for `query` / `mutation` that only run for signed-in, approved people
 * (teachers approved by an admin, and admins). Same types as the originals.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const guard = (raw: any) => (def: any) => {
  const handler = typeof def === "function" ? def : def.handler;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const guarded = async (ctx: any, args: any) => {
    await requireApproved(ctx);
    return handler(ctx, args);
  };
  return raw(typeof def === "function" ? guarded : { ...def, handler: guarded });
};

export const query = guard(rawQuery) as typeof rawQuery;
export const mutation = guard(rawMutation) as typeof rawMutation;
