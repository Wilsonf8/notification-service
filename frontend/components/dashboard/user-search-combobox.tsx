/**
 * User search combobox with debounced typeahead.
 * Searches users by username, email, or name and displays results in a dropdown.
 * @module components/dashboard/user-search-combobox
 */
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { searchUsers } from "@/lib/api/users";
import type { UserSearchResult } from "@/lib/types";

/** Props for the UserSearchCombobox component */
interface UserSearchComboboxProps {
  /** The organization ID to exclude members from search results */
  excludeOrgId: string;
  /** Callback when a user is selected */
  onSelect: (user: UserSearchResult) => void;
  /** Whether the combobox is disabled */
  disabled?: boolean;
}

/**
 * Combobox that searches for users across the platform with debounced input.
 * Shows user avatar, name, username, and email in results.
 *
 * @param props - Component props
 */
export function UserSearchCombobox({
  excludeOrgId,
  onSelect,
  disabled = false,
}: UserSearchComboboxProps) {
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Fetches search results with debouncing.
   */
  const handleInputChange = useCallback(
    (value: string) => {
      setInputValue(value);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (value.trim().length < 2) {
        setResults([]);
        return;
      }

      debounceRef.current = setTimeout(async () => {
        try {
          setLoading(true);
          const data = await searchUsers(value.trim(), excludeOrgId);
          setResults(data);
        } catch {
          setResults([]);
        } finally {
          setLoading(false);
        }
      }, 300);
    },
    [excludeOrgId]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  /**
   * Returns the display initial for a user's avatar.
   */
  const getInitial = (user: UserSearchResult): string => {
    if (user.firstName) return user.firstName.charAt(0).toUpperCase();
    return user.username.charAt(0).toUpperCase();
  };

  /**
   * Returns the display name for a user.
   */
  const getDisplayName = (user: UserSearchResult): string => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.username;
  };

  return (
    <Combobox
      open={results.length > 0 || (inputValue.trim().length >= 2 && !loading)}
      onOpenChange={() => {}}
      value={null}
      onValueChange={(value) => {
        if (value) {
          const user = results.find((u) => u.id === value);
          if (user) {
            onSelect(user);
            setInputValue("");
            setResults([]);
          }
        }
      }}
    >
      <ComboboxInput
        placeholder="Search by username, email, or name..."
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        disabled={disabled}
        showTrigger={false}
        autoComplete="off"
      />
      <ComboboxContent>
        <ComboboxList>
          {results.map((user) => (
            <ComboboxItem key={user.id} value={user.id}>
              <div className="flex items-center gap-3 w-full">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="text-[10px]">
                    {getInitial(user)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">
                    {getDisplayName(user)}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    @{user.username}
                    {user.email && ` · ${user.email}`}
                  </p>
                </div>
              </div>
            </ComboboxItem>
          ))}
        </ComboboxList>
        <ComboboxEmpty>
          {loading ? "Searching..." : "No users found"}
        </ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  );
}
