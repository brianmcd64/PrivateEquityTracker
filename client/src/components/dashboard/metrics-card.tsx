import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricsCardProps {
  title: string;
  value: string | number;
  children?: ReactNode;
  badge?: {
    text: string;
    variant: "primary" | "warning" | "danger" | "success";
  };
  progress?: {
    value: number;
    max: number;
    color: "primary" | "warning" | "danger" | "success";
  };
  items?: Array<{
    text: string;
    color?: "primary" | "warning" | "danger" | "success";
    meta?: string;
  }>;
}

export function MetricsCard({ title, value, children, badge, progress, items }: MetricsCardProps) {
  const getBadgeStyles = () => {
    const baseStyles = "text-xs font-medium rounded-full px-2 py-1";
    switch (badge?.variant) {
      case "primary":
        return cn(baseStyles, "text-primary bg-primary/10");
      case "warning":
        return cn(baseStyles, "text-warning bg-warning/10");
      case "danger":
        return cn(baseStyles, "text-danger bg-danger/10");
      case "success":
        return cn(baseStyles, "text-success bg-success/10");
      default:
        return baseStyles;
    }
  };

  const getProgressColor = () => {
    switch (progress?.color) {
      case "primary":
        return "bg-accent";
      case "warning":
        return "bg-warning";
      case "danger":
        return "bg-danger";
      case "success":
        return "bg-success";
      default:
        return "bg-accent";
    }
  };

  const getDotColor = (color: string = "primary") => {
    switch (color) {
      case "primary":
        return "bg-accent";
      case "warning":
        return "bg-warning";
      case "danger":
        return "bg-danger";
      case "success":
        return "bg-success";
      default:
        return "bg-accent";
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-neutral-500 text-sm font-medium">{title}</h3>
          {badge && <span className={getBadgeStyles()}>{badge.text}</span>}
        </div>
        <p className="mt-2 text-3xl font-bold text-neutral-900">{value}</p>
        
        {progress && (
          <>
            <div className="mt-4 w-full bg-neutral-200 rounded-full h-2">
              <div 
                className={cn(getProgressColor(), "h-2 rounded-full")} 
                style={{ width: `${(progress.value / progress.max) * 100}%` }}
              ></div>
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              {Math.round((progress.value / progress.max) * 100)}% complete ({progress.value} of {progress.max} tasks)
            </p>
          </>
        )}
        
        {items && items.length > 0 && (
          <ul className="mt-2 space-y-1">
            {items.map((item, idx) => (
              <li key={idx} className="text-sm text-neutral-600 flex items-center justify-between">
                <span className="flex items-center truncate">
                  <span className={cn("w-2 h-2 rounded-full mt-0.5 mr-2 flex-shrink-0", getDotColor(item.color))}></span>
                  <span className="truncate">{item.text}</span>
                </span>
                {item.meta && <span className="text-xs text-neutral-500 ml-1 flex-shrink-0">{item.meta}</span>}
              </li>
            ))}
          </ul>
        )}
        
        {children}
      </CardContent>
    </Card>
  );
}
