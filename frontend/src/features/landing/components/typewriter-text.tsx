"use client";

import { useEffect, useState } from "react";

const typingDelay = 78;
const deletingDelay = 42;
const phrasePause = 1700;
const phrases = ["More connection.", "More conversation."] as const;
const initialText = phrases[0];

export function TypewriterText() {
  const [text, setText] = useState<string>(initialText);

  useEffect(() => {
    const motionPreference =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    if (motionPreference?.matches) {
      return;
    }

    let phraseIndex = 0;
    let characterIndex = initialText.length;
    let isDeleting = true;
    let timer = 0;

    function schedule(delay: number) {
      timer = window.setTimeout(tick, delay);
    }

    function tick() {
      const phrase = phrases[phraseIndex] ?? initialText;

      if (isDeleting && characterIndex > 0) {
        characterIndex -= 1;
        setText(phrase.slice(0, characterIndex));
        schedule(deletingDelay);
        return;
      }

      if (isDeleting) {
        phraseIndex = (phraseIndex + 1) % phrases.length;
        isDeleting = false;
        schedule(typingDelay);
        return;
      }

      if (characterIndex < phrase.length) {
        characterIndex += 1;
        setText(phrase.slice(0, characterIndex));
        schedule(typingDelay);
        return;
      }

      isDeleting = true;
      schedule(phrasePause);
    }

    function handleMotionPreferenceChange(event: MediaQueryListEvent) {
      window.clearTimeout(timer);
      phraseIndex = 0;
      characterIndex = initialText.length;
      isDeleting = true;
      setText(initialText);

      if (!event.matches) {
        schedule(phrasePause);
      }
    }

    schedule(phrasePause);
    motionPreference?.addEventListener(
      "change",
      handleMotionPreferenceChange,
    );

    return () => {
      window.clearTimeout(timer);
      motionPreference?.removeEventListener("change", handleMotionPreferenceChange);
    };
  }, []);

  return (
    <span aria-hidden="true">
      <span>{text}</span>
      <span aria-hidden="true" className="landing-type-cursor ml-1" />
    </span>
  );
}
