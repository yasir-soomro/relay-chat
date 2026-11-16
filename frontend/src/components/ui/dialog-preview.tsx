"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export function DialogPreview() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} type="button" variant="secondary">
        Preview dialog
      </Button>
      <Dialog
        description="Native modal behavior keeps keyboard focus inside until dismissed."
        onClose={() => setOpen(false)}
        open={open}
        title="A reusable dialog"
      >
        <div className="flex justify-end">
          <Button onClick={() => setOpen(false)} type="button">
            Done
          </Button>
        </div>
      </Dialog>
    </>
  );
}
