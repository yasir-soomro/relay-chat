import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UsernameSearch } from "@/features/users/components/username-search";

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
});
