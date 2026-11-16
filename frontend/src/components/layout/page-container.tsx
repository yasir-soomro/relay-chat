import type { ReactNode } from "react";

type PageContainerProps = {
  children: ReactNode;
  className?: string;
};

export function PageContainer({
  children,
  className = "",
}: PageContainerProps) {
  return (
    <div className={`mx-auto w-full max-w-content px-5 sm:px-8 lg:px-12 ${className}`}>
      {children}
    </div>
  );
}
