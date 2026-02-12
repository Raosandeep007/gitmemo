import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import App from "@/App";
import MainLayout from "@/layouts/MainLayout";
import RootLayout from "@/layouts/RootLayout";
import Home from "@/pages/Home";

const Archived = lazy(() => import("@/pages/Archived"));
const Explore = lazy(() => import("@/pages/Explore"));
const MemoDetail = lazy(() => import("@/pages/MemoDetail"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const PermissionDenied = lazy(() => import("@/pages/PermissionDenied"));
const Attachments = lazy(() => import("@/pages/Attachments"));
const Setting = lazy(() => import("@/pages/Setting"));
const UserProfile = lazy(() => import("@/pages/UserProfile"));
const GitHubSetup = lazy(() => import("@/pages/GitHubSetup"));

import { ROUTES } from "./routes";

// Backward compatibility alias
export const Routes = ROUTES;
export { ROUTES };

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: Routes.GITHUB_SETUP,
        element: <GitHubSetup />,
      },
      {
        path: Routes.ROOT,
        element: <RootLayout />,
        children: [
          {
            element: <MainLayout />,
            children: [
              { path: "", element: <Home /> },
              { path: Routes.EXPLORE, element: <Explore /> },
              { path: Routes.ARCHIVED, element: <Archived /> },
              { path: "u/:username", element: <UserProfile /> },
            ],
          },
          { path: Routes.ATTACHMENTS, element: <Attachments /> },
          { path: Routes.SETTING, element: <Setting /> },
          { path: "memos/:uid", element: <MemoDetail /> },
          { path: "403", element: <PermissionDenied /> },
          { path: "404", element: <NotFound /> },
          { path: "*", element: <NotFound /> },
        ],
      },
    ],
  },
]);

export default router;
