import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UsernameSearch } from "@/features/users/components/username-search";

afterEach(() => {
  vi.useRealTimers();
});

describe("UsernameSearch", () => {
  it("debounces and trims username searches", () => {
    vi.useFakeTimers();
    const onSearch = vi.fn();
    render(<UsernameSearch onSearch={onSearch} />);

    fireEvent.change(screen.getByLabelText("Search by username"), {
      target: { value: "  relay  " },
    });
    expect(onSearch).not.toHaveBeenCalled();

    vi.advanceTimersByTime(299);
    expect(onSearch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onSearch).toHaveBeenCalledExactlyOnceWith("relay");
  });

  it("clears the query and returns focus to the search field", () => {
    const onSearch = vi.fn();
    render(<UsernameSearch onSearch={onSearch} />);

    const input = screen.getByRole("searchbox", {
      name: "Search by username",
    });
    fireEvent.change(input, { target: { value: "relay" } });

    fireEvent.click(
      screen.getByRole("button", { name: "Clear username search" }),
    );

    expect((input as HTMLInputElement).value).toBe("");
    expect(document.activeElement).toBe(input);
    expect(
      screen.queryByRole("button", { name: "Clear username search" }),
    ).toBeNull();
  });
});
