import Image from "next/image";
import { RegistrationForm } from "@/features/auth/components/registration-form";

const introductionSteps = ["Discover", "Connect", "Say hello"];

export function RegistrationPage() {
  return (
    <div className="registration-page grid min-h-[calc(100svh-4.5rem)] grid-cols-1 lg:grid-cols-2">
      <section
        aria-labelledby="registration-brand-heading"
        className="registration-brand-panel motion-rise flex flex-col justify-between px-5 py-8 text-white sm:px-10 sm:py-10 lg:px-11 lg:py-12 xl:px-16"
      >
        <div className="mx-auto w-full max-w-[38rem]">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-white/75">
            Real people. Real connection.
          </p>
          <h2
            className="mt-4 text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.055em] sm:text-5xl xl:text-[3.25rem]"
            id="registration-brand-heading"
          >
            Less noise.
            <br />
            More connection.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/75 sm:mt-5 sm:text-base sm:leading-7">
            A new perspective. A familiar feeling. Your next good conversation
            starts here.
          </p>

          <article
            aria-label="Illustrative one-to-one conversation preview"
            className="registration-conversation-card mt-6 rounded-2xl bg-white p-4 text-ink sm:mt-8 sm:p-5"
          >
            <div className="flex items-center gap-3">
              <Image
                alt=""
                className="size-10 rounded-full object-cover ring-1 ring-line sm:size-11"
                height={48}
                src="/images/Youthful%20Professional%20Studio%20Portrait.png"
                width={48}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">Relay member</p>
                <p className="mt-0.5 text-xs text-primary">Connected</p>
              </div>
              <span className="rounded-full bg-soft px-2.5 py-1 text-[0.65rem] font-medium text-muted">
                One-to-one
              </span>
            </div>
            <div className="mt-4 space-y-2.5 text-xs leading-5 sm:mt-5 sm:space-y-3 sm:text-sm">
              <p className="max-w-[84%] rounded-xl rounded-tl-sm bg-soft px-3 py-2.5">
                Hi, glad we connected.
              </p>
              <p className="ml-auto max-w-[84%] rounded-xl rounded-tr-sm bg-secondary px-3 py-2.5 text-secondary-foreground">
                Me too. Nice to meet you.
              </p>
            </div>
            <p className="mt-3 text-[0.65rem] text-muted">
              Conversation preview
            </p>
          </article>

          <ol
            aria-label="Three steps to a conversation"
            className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-[0.7rem] font-medium text-white/85 sm:mt-8 sm:gap-x-4 sm:text-xs"
          >
            {introductionSteps.map((step, index) => (
              <li className="flex items-center gap-3 sm:gap-4" key={step}>
                <span className="whitespace-nowrap">
                  <span className="mr-1.5 text-white/55">
                    0{index + 1}
                  </span>
                  {step}
                </span>
                {index < introductionSteps.length - 1 ? (
                  <span aria-hidden="true" className="text-white/45">
                    /
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        </div>

        <p className="mx-auto mt-8 w-full max-w-[38rem] text-xs leading-5 text-white/65 lg:mt-10">
          A little closer, one conversation at a time.
        </p>
      </section>

      <section
        aria-labelledby="registration-heading"
        className="registration-form-panel flex flex-col justify-between px-5 py-9 sm:px-10 sm:py-10 lg:px-11 lg:py-12 xl:px-16"
      >
        <div className="motion-rise-delayed my-auto mx-auto w-full max-w-md">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-primary">
            Start something good
          </p>
          <h1
            className="mt-3 text-balance text-3xl font-semibold leading-tight tracking-[-0.045em] text-ink sm:text-4xl"
            id="registration-heading"
          >
            Your next hello starts here.
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Create an account. Find your people.
          </p>
          <div className="mt-6 sm:mt-7">
            <RegistrationForm />
          </div>
        </div>

        <footer className="mx-auto mt-8 flex w-full max-w-md flex-col gap-2 text-[0.65rem] text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>Relay Chat</p>
          <p>Discover. Connect. Say hello.</p>
        </footer>
      </section>
    </div>
  );
}
