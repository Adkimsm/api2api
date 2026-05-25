import { useEffect, useState } from "react";

export type Route = "overview" | "providers" | "models";

const DEFAULT: Route = "overview";

function parseHash(): Route {
  const raw = window.location.hash.replace(/^#\/?/, "").split("/")[0];
  if (raw === "providers" || raw === "models" || raw === "overview") return raw;
  return DEFAULT;
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash());
  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export function routeHref(route: Route): string {
  return `#/${route}`;
}
