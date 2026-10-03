import { useAtom } from "jotai";
import { entitlementAtom } from "@/ee/entitlement/entitlement-atom";

import { Feature } from "@/ee/features";

export const useHasFeature = (feature: string): boolean => {
  const [entitlements] = useAtom(entitlementAtom);
  if (feature === Feature.BASES) return true;
  return entitlements?.features?.includes(feature) ?? false;
};
