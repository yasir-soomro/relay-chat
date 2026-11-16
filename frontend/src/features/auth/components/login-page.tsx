import { LoginForm } from "@/features/auth/components/login-form";

export function LoginPage() {
  return (
    <div className="login-page flex min-h-[calc(100svh-4.5rem)] flex-col px-5 sm:px-8">
      <section
        aria-labelledby="login-heading"
        className="motion-rise my-auto mx-auto w-full max-w-[25rem] py-10"
      >
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-primary">
          Good to have you here
        </p>
        <h1
          className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.045em] text-ink sm:text-4xl"
          id="login-heading"
        >
          Welcome back.
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted sm:text-base">
          Sign in and pick up where you left off.
        </p>
        <div className="mt-8">
          <LoginForm />
        </div>
        <p className="mt-7 text-sm text-muted">
          A private space for meaningful conversations.
        </p>
      </section>

      <footer className="mx-auto mb-7 flex w-full max-w-[25rem] flex-col gap-2 text-[0.7rem] text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>Relay Chat</p>
        <p>Discover. Connect. Say hello.</p>
      </footer>
    </div>
  );
}
