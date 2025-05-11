import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard,
  CheckSquare,
  MessageSquare,
  LayoutList,
  Calendar,
  BarChart3,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface SidebarProps {
  className?: string;
  isMobile: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ className, isMobile, isOpen, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const [activeDeal, setActiveDeal] = useState<string>("TechFusion Acquisition");
  const [deals, setDeals] = useState([
    { id: 1, name: "TechFusion Acquisition" },
    { id: 2, name: "Medical Innovations Co." },
    { id: 3, name: "Global Logistics Partners" },
  ]);
  const [dealsOpen, setDealsOpen] = useState(true);

  useEffect(() => {
    // Close sidebar on route change for mobile
    if (isMobile) {
      onClose();
    }
  }, [location, isMobile, onClose]);

  const menuItems = [
    { path: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5 mr-3 text-neutral-500" /> },
    { path: "/checklist", label: "Checklist", icon: <CheckSquare className="h-5 w-5 mr-3 text-neutral-500" /> },
    { path: "/requests", label: "Requests & Q&A", icon: <MessageSquare className="h-5 w-5 mr-3 text-neutral-500" /> },
    { path: "/raci", label: "RACI Matrix", icon: <LayoutList className="h-5 w-5 mr-3 text-neutral-500" /> },
    { path: "/calendar", label: "Calendar", icon: <Calendar className="h-5 w-5 mr-3 text-neutral-500" /> },
    { path: "/reports", label: "Reports & Analytics", icon: <BarChart3 className="h-5 w-5 mr-3 text-neutral-500" /> },
  ];

  const handleDealClick = (deal: string) => {
    setActiveDeal(deal);
  };

  return (
    <aside
      className={cn(
        "sidebar bg-white w-64 border-r border-neutral-200 flex-shrink-0 h-full fixed md:static z-20",
        isMobile && "transform -translate-x-full transition-transform duration-300 ease-in-out",
        isMobile && isOpen && "transform translate-x-0",
        className
      )}
    >
      <nav className="h-full py-4 overflow-y-auto">
        <div className="px-4 mb-6">
          <p className="text-xs uppercase tracking-wider text-neutral-500 font-semibold mb-2">Navigation</p>
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.path}>
                <Link href={item.path}>
                  <a
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-neutral-100 pl-4",
                      location === item.path && "sidebar-menu-item active bg-blue-50 border-l-3 border-blue-500"
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </a>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-wider text-neutral-500 font-semibold">Active Deals</p>
            <button 
              onClick={() => setDealsOpen(!dealsOpen)}
              className="text-neutral-500 hover:text-neutral-700"
            >
              {dealsOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          </div>
          
          {dealsOpen && (
            <ul className="space-y-1">
              {deals.map((deal) => (
                <li key={deal.id}>
                  <button
                    onClick={() => handleDealClick(deal.name)}
                    className={cn(
                      "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md",
                      activeDeal === deal.name
                        ? "text-white bg-primary"
                        : "text-neutral-700 hover:bg-neutral-100"
                    )}
                  >
                    <span className="truncate">{deal.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          
          {user?.role === "deal_lead" && (
            <button className="mt-3 w-full text-sm text-primary font-medium flex items-center justify-center">
              <span className="mr-1">+</span> Add New Deal
            </button>
          )}
        </div>
      </nav>
    </aside>
  );
}
