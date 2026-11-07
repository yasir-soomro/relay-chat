export default function AppHomePage() {
  return (
    <section aria-labelledby="workspace-heading" className="mx-auto max-w-3xl">
      <p className="text-sm font-medium text-moss">Your space</p>
      <h1
        className="mt-3 text-3xl font-medium tracking-[-0.055em] text-ink sm:text-4xl"
        id="workspace-heading"
      >
        A little room for the people who matter.
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
        Your Relay workspace is ready to take shape.
      </p>
    </section>
  );
}
