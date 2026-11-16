import { dehydrate, hydrate, QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { PageError } from "@/components/PageError";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // A page's error renders inside the shell; only the shell's own failure fills the screen.
    defaultErrorComponent: PageError,
    defaultPreloadStaleTime: 0,
    // The browser must start from the cache the server's loaders filled. JSON, because the
    // query state is not typed as serializable.
    dehydrate: () => ({ queries: JSON.stringify(dehydrate(queryClient)) }),
    hydrate: (d) => hydrate(queryClient, JSON.parse(d.queries)),
  });

  return router;
};
