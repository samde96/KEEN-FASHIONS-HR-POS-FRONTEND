import type { ReactNode } from 'react';

export default function DialogBackdrop({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  return (
    <div className={className} role="presentation">
      {children}
    </div>
  );
}
