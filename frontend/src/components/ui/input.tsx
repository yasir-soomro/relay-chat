import type {
  InputHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { formControlClassName } from "@/components/ui/form-control";

type InputProps = InputHTMLAttributes<HTMLInputElement>;
type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Input({ className = "", ...props }: InputProps) {
  return (
    <input
      className={`${formControlClassName} ${className}`.trim()}
      {...props}
    />
  );
}

export function Textarea({ className = "", ...props }: TextareaProps) {
  return (
    <textarea
      className={`${formControlClassName} ${className}`.trim()}
      {...props}
    />
  );
}
