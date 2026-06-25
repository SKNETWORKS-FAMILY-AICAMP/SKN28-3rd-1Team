export const DEMO_ACCESS_COOKIE_NAME = "skn28_demo_access";
export const DEMO_ACCESS_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 6;

export function getDemoAccessKey() {
  return process.env.DEMO_ACCESS_KEY?.trim() ?? "";
}

export function isDemoAccessEnabled() {
  return Boolean(getDemoAccessKey());
}

export function isDemoAccessCookieValid(cookieValue: string | undefined) {
  const accessKey = getDemoAccessKey();
  return Boolean(accessKey && cookieValue === accessKey);
}

export function shouldUseSecureDemoCookie(protocol: string) {
  return protocol === "https:";
}
