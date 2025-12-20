import { isNative, isIOS, isAndroid, getPlatform } from "@/lib/capacitor/platform";

export function useCapacitor() {
  return {
    isNative,
    isIOS,
    isAndroid,
    platform: getPlatform(),
  };
}

