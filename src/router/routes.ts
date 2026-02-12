export const ROUTES = {
  ROOT: "/",
  ATTACHMENTS: "/attachments",
  ARCHIVED: "/archived",
  SETTING: "/setting",
  EXPLORE: "/explore",
  GITHUB_SETUP: "/github-setup",
} as const;

export type RouteKey = keyof typeof ROUTES;
export type RoutePath = (typeof ROUTES)[RouteKey];
