import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchUsers } from "../api/endpoints";
import type { User } from "../api/types";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function UserSuggestion({
  query,
  onSelect,
  hide,
}: {
  query: string;
  onSelect: (u: User | null) => void;
  hide?: boolean;
}) {
  const debouncedQuery = useDebounce(query, 500);
  const { data: matches = [], isFetching } = useQuery({
    queryKey: ["user-search", debouncedQuery],
    queryFn: () => searchUsers(debouncedQuery),
    enabled: debouncedQuery.trim().length > 0,
  });

  if (hide) return null;
  if (!query.trim()) return null;
  if (isFetching) return <p className="suggestion-hint">Searching…</p>;
  if (matches.length === 0) return <p className="suggestion-hint text-muted">No registered user found — will be added as offline.</p>;

  return (
    <div className="suggestion-list">
      {matches.map((u) => (
        <button
          key={u.id}
          type="button"
          className="suggestion-item"
          onClick={() => onSelect(u)}
        >
          <span className="suggestion-name">{u.display_name}</span>
          <span className="suggestion-email text-muted">{[u.mobile_number, u.email].filter(Boolean).join(" · ")}</span>
        </button>
      ))}
    </div>
  );
}
