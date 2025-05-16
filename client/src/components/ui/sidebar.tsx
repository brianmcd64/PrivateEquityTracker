import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Deal } from "@shared/schema";
import {
  LayoutDashboard,
  CheckSquare,
  MessageSquare,
  Calendar,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Briefcase,
  FileText,
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
  const [activeDealId, setActiveDealId] = useState<number | null>(null);
  const [dealsOpen, setDealsOpen] = useState(true);
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);

  const [, setLocation] = useLocation();

  // Fetch all deals
  const { data: deals = [], isLoading } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });

  // Filter for active and open deals
  const activeDeals = deals.filter(deal => deal.status === "active" || deal.status === "open");

  useEffect(() => {
    // Close sidebar on route change for mobile
    if (isMobile) {
      onClose();
    }
  }, [location, isMobile, onClose]);

  // Load active deal from localStorage
  useEffect(() => {
    // Check for activeDealId first (this is the primary source of truth)
    const storedDealId = localStorage.getItem("activeDealId");
    if (storedDealId) {
      const dealId = parseInt(storedDealId);
      setActiveDealId(dealId);
      
      // Find the deal in the loaded deals
      if (deals && deals.length > 0) {
        const foundDeal = deals.find(d => d.id === dealId);
        if (foundDeal) {
          setActiveDeal(foundDeal);
          // Update stored deal to ensure consistency
          localStorage.setItem("activeDeal", JSON.stringify({
            id: foundDeal.id,
            name: foundDeal.name,
            status: foundDeal.status
          }));
          return;
        }
      }
    }
    
    // Fallback to checking activeDeal
    const storedDeal = localStorage.getItem("activeDeal");
    if (storedDeal) {
      try {
        const parsedDeal = JSON.parse(storedDeal);
        setActiveDeal(parsedDeal);
        setActiveDealId(parsedDeal.id);
        // Make sure activeDealId is also updated
        localStorage.setItem("activeDealId", parsedDeal.id.toString());
        return;
      } catch (e) {
        console.error("Failed to parse active deal from localStorage");
      }
    }
    
    // If no active deal is set and we have deals, use the first active/open one
    if (activeDeals.length > 0) {
      // Set first deal as active if nothing is stored
      const firstDeal = activeDeals[0];
      setActiveDealId(firstDeal.id);
      setActiveDeal(firstDeal);
      localStorage.setItem("activeDealId", firstDeal.id.toString());
      localStorage.setItem("activeDeal", JSON.stringify({
        id: firstDeal.id,
        name: firstDeal.name,
        status: firstDeal.status
      }));
    }
  }, [activeDeals, deals]);

  const menuItems = [
    { path: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5 mr-3 text-neutral-500" /> },
    { path: "/checklist", label: "Checklist", icon: <CheckSquare className="h-5 w-5 mr-3 text-neutral-500" /> },
    { path: "/requests", label: "Requests & Q&A", icon: <MessageSquare className="h-5 w-5 mr-3 text-neutral-500" /> },
    { path: "/calendar", label: "Calendar", icon: <Calendar className="h-5 w-5 mr-3 text-neutral-500" /> },
    { path: "/reports", label: "Reports & Analytics", icon: <BarChart3 className="h-5 w-5 mr-3 text-neutral-500" /> },
    { path: "/deals", label: "Deal Management", icon: <Briefcase className="h-5 w-5 mr-3 text-neutral-500" /> },
    { path: "/templates", label: "Task Templates", icon: <FileText className="h-5 w-5 mr-3 text-neutral-500" /> },
  ];

  const handleDealClick = (deal: Deal) => {
    // Update both the active deal object and the active deal ID
    setActiveDeal(deal);
    setActiveDealId(deal.id);
    
    // Update both localStorage values for consistency
    localStorage.setItem("activeDealId", deal.id.toString());
    localStorage.setItem("activeDeal", JSON.stringify({
      id: deal.id,
      name: deal.name,
      status: deal.status
    }));
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
      <nav className="h-full py-4 overflow-y-auto flex flex-col">
        {/* Active Deal Name at the top */}
        {activeDeal && (
          <div className="px-4 mb-4">
            <div className="bg-blue-50 rounded-md p-3">
              <p className="text-xs uppercase tracking-wider text-neutral-500 font-semibold mb-1">Active Deal</p>
              <p className="text-sm font-medium truncate text-primary">{activeDeal.name}</p>
            </div>
          </div>
        )}
        
        {/* Navigation Menu */}
        <div className="px-4 mb-6 flex-grow">
          <p className="text-xs uppercase tracking-wider text-neutral-500 font-semibold mb-2">Navigation</p>
          <ul className="space-y-1">
            {menuItems.filter(item => item.path !== "/deals").map((item) => (
              <li key={item.path}>
                <Link 
                href={activeDeal ? item.path : "/deals"}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-neutral-100 pl-4",
                  location === item.path && "sidebar-menu-item active bg-blue-50 border-l-3 border-blue-500"
                )}
                onClick={(e) => {
                  if (!activeDeal && item.path !== "/deals") {
                    e.preventDefault();
                    setLocation("/deals");
                  }
                }}
              >
                  {item.icon}
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Manage Deals at the bottom */}
        <div className="px-4 mt-auto mb-6">
          <Link 
            href="/deals"
            className={cn(
              "flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-neutral-100 w-full",
              location === "/deals" && "bg-blue-50 border-l-3 border-blue-500"
            )}
          >
            <Briefcase className="h-5 w-5 mr-3 text-neutral-500" />
            Manage Deals
          </Link>
        </div>
      </nav>
    </aside>
  );
}