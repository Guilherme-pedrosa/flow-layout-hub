import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div 
      className={cn(
        "animate-pulse-subtle rounded-md bg-muted",
        className
      )} 
      {...props} 
    />
  );
}

// Skeleton variants for common use cases
function SkeletonText({ className, ...props }: SkeletonProps) {
  return <Skeleton className={cn("h-4 w-full", className)} {...props} />;
}

function SkeletonTitle({ className, ...props }: SkeletonProps) {
  return <Skeleton className={cn("h-6 w-3/4", className)} {...props} />;
}

function SkeletonCard({ className, ...props }: SkeletonProps) {
  return <Skeleton className={cn("h-32 w-full rounded-xl", className)} {...props} />;
}

function SkeletonAvatar({ className, ...props }: SkeletonProps) {
  return <Skeleton className={cn("h-10 w-10 rounded-full", className)} {...props} />;
}

function SkeletonButton({ className, ...props }: SkeletonProps) {
  return <Skeleton className={cn("h-10 w-24 rounded-lg", className)} {...props} />;
}

// Table skeleton row
function SkeletonTableRow({ columns = 5, className, ...props }: SkeletonProps & { columns?: number }) {
  return (
    <div className={cn("flex gap-4 py-4 border-b border-border", className)} {...props}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
  );
}

export { 
  Skeleton, 
  SkeletonText, 
  SkeletonTitle, 
  SkeletonCard, 
  SkeletonAvatar, 
  SkeletonButton,
  SkeletonTableRow 
};
