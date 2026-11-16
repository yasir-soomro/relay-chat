import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TypewriterText } from "@/features/landing/components/typewriter-text";

describe("TypewriterText", () => {
  it("deletes the current phrase and types the next one without changing its initial render", () => {
    vi.useFakeTimers();
    const { container } = render(<TypewriterText />);
    const phrase = () =>
      container.querySelector(".landing-type-cursor")?.previousElementSibling
        ?.textContent;

    expect(phrase()).toBe("More connection.");

    act(() => {
      vi.advanceTimersByTime(1700);
    });
    expect(phrase()).toBe("More connection");

    act(() => {
      vi.advanceTimersByTime(2800);
    });
    expect(phrase()).toBe("More conversation.");
  });
});
