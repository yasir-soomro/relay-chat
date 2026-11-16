import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DialogPreview } from "@/components/ui/dialog-preview";
import { Dropdown } from "@/components/ui/dropdown";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Toast } from "@/components/ui/toast";

const colorRoles = [
  { className: "bg-primary", label: "Primary" },
  { className: "bg-accent", label: "Accent" },
  { className: "bg-canvas", label: "Background" },
  { className: "bg-surface-raised", label: "Raised surface" },
  { className: "bg-success", label: "Success" },
  { className: "bg-warning", label: "Warning" },
  { className: "bg-danger", label: "Danger" },
  { className: "bg-info", label: "Information" },
];

export function DesignSystemShowcase() {
  return (
    <div className="mx-auto max-w-content space-y-10 px-5 py-10 sm:px-8 sm:py-14">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-2xl">
          <p className="text-caption font-semibold uppercase tracking-[0.14em] text-accent-strong">
            Relay foundations
          </p>
          <h1 className="mt-3 text-title font-semibold tracking-tight text-ink sm:text-display">
            Design system
          </h1>
          <p className="mt-3 text-body text-muted">
            A compact preview of the shared colors, controls, and surfaces. Use
            the theme control in the navigation to compare System, Light, and
            Dark appearances.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <section aria-labelledby="color-roles-heading" className="space-y-4">
        <h2 className="text-heading font-semibold text-ink" id="color-roles-heading">
          Color roles
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {colorRoles.map((color) => (
            <Card className="p-3" key={color.label}>
              <div
                aria-hidden="true"
                className={`h-12 rounded-control border border-line ${color.className}`}
              />
              <p className="mt-2 text-sm font-medium text-ink">{color.label}</p>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="controls-heading" className="space-y-4">
        <h2 className="text-heading font-semibold text-ink" id="controls-heading">
          Controls and status
        </h2>
        <Card className="grid gap-6 p-5 sm:p-7 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button type="button">Primary action</Button>
              <Button type="button" variant="secondary">
                Secondary
              </Button>
              <Button type="button" variant="quiet">
                Quiet
              </Button>
              <Button type="button" variant="destructive">
                Destructive
              </Button>
              <Button loading type="button">
                Saving
              </Button>
            </div>
            <label className="block space-y-2 text-sm font-medium text-ink">
              <span>Text input</span>
              <Input placeholder="Your message" />
            </label>
            <div className="flex flex-wrap gap-2">
              <Badge>Neutral</Badge>
              <Badge tone="success">Connected</Badge>
              <Badge tone="warning">Pending</Badge>
              <Badge tone="danger">Needs attention</Badge>
              <Badge tone="info">New</Badge>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar name="Relay Member" />
              <Avatar name="Jordan Lee" size="small" />
              <div>
                <p className="font-semibold text-ink">Reusable avatar</p>
                <p className="text-sm text-muted">Initials fallback</p>
              </div>
            </div>
            <Toast title="Changes saved" tone="success">
              Your preferences are up to date.
            </Toast>
            <div className="flex flex-wrap items-center gap-3">
              <Dropdown trigger="Quick links">
                <a
                  className="block rounded-control px-3 py-2 text-sm hover:bg-soft focus-visible:outline-2 focus-visible:outline-focus"
                  href="#color-roles-heading"
                >
                  Color roles
                </a>
                <a
                  className="block rounded-control px-3 py-2 text-sm hover:bg-soft focus-visible:outline-2 focus-visible:outline-focus"
                  href="#controls-heading"
                >
                  Controls
                </a>
              </Dropdown>
              <DialogPreview />
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
