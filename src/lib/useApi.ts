"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export function useApi<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(url));
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!url) return;
    let active = true;
    setLoading(true);
    setError(null);
    apiFetch<T>(url)
      .then((res) => {
        if (active) setData(res);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "加载失败");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [url, version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  return { data, loading, error, refresh, setData };
}
