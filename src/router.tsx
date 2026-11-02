import { dehydrate, hydrate, QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // A route change, not a tab or filter change, runs a view transition; never under reduced motion.
    defaultViewTransition: {
      types: ({ pathChanged }) =>
        pathChanged && !matchMedia("(prefers-reduced-motion: reduce)").matches ? ["route"] : false,
    },
    defaultPreloadStaleTime: 0,
    // The browser must start from the cache the server's loaders filled. JSON, because the
    // query state is not typed as serializable.
    dehydrate: () => ({ queries: JSON.stringify(dehydrate(queryClient)) }),
    hydrate: (d) => hydrate(queryClient, JSON.parse(d.queries)),
  });

  return router;
};
