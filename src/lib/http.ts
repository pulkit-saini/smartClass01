const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

interface HttpOptions extends RequestInit {
  query?: Record<string, string | number | boolean | undefined>;
}

const buildUrl = (path: string, query?: HttpOptions["query"]) => {
  const base = API_BASE_URL.replace(/\/$/, "");
  const sanitizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${base}${sanitizedPath}`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
};

export const http = async <T>(path: string, options: HttpOptions = {}): Promise<T> => {
  const { query, headers, ...rest } = options;

  const response = await fetch(buildUrl(path, query), {
    headers: {
      "Content-Type": "application/json",
      ...headers
    },
    ...rest
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
};
