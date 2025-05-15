import { useState, useEffect } from "react";
import { useLocation, Link, useNavigate } from "wouter";
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
  const [activeDeal, setActiveDeal] = useState<Deal | null>(() => {
    const storedDeal = localStorage.getItem("activeDeal");
    return storedDeal ? JSON.parse(storedDeal) : null;
  });

  const navigate = useNavigate();

  // Fetch all deals
  const { data: deals = [], isLoading } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });

  // Filter for active deals only
  const activeDeals = deals.filter(deal => deal.status === "active");

  useEffect(() => {
    // Close sidebar on route change for mobile
    if (isMobile) {
      onClose();
    }
  }, [location, isMobile, onClose]);

  // Load active deal from localStorage
  useEffect(() => {
    const storedDealId = localStorage.getItem("activeDealId");
    if (storedDealId) {
      setActiveDealId(parseInt(storedDealId));
    } else if (activeDeals.length > 0) {
      // Set first deal as active if nothing is stored
      const firstDeal = activeDeals[0];
      setActiveDealId(firstDeal.id);
      localStorage.setItem("activeDealId", firstDeal.id.toString());

      // Also store the full deal object
      localStorage.setItem("activeDeal", JSON.stringify({
        id: firstDeal.id,
        name: firstDeal.name,
        status: firstDeal.status
      }));
    }
  }, [activeDeals]);

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
    setActiveDeal(deal);
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
      <nav className="h-full py-4 overflow-y-auto">
        <div className="px-4 mb-6">
          <p className="text-xs uppercase tracking-wider text-neutral-500 font-semibold mb-2">Navigation</p>
          <ul className="space-y-1">
            {menuItems.map((item) => (
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
                    navigate("/deals");
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
            <div>
              {isLoading ? (
                <p className="text-sm text-neutral-500 text-center py-2">Loading deals...</p>
              ) : activeDeals.length === 0 ? (
                <p className="text-sm text-neutral-500 text-center py-2">No active deals</p>
              ) : (
                <ul className="space-y-1">
                  {activeDeals.map((deal) => (
                    <li key={deal.id}>
                      <button
                        onClick={() => handleDealClick(deal)}
                        className={cn(
                          "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md",
                          activeDeal?.id === deal.id
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

              <div className="mt-3 flex flex-col space-y-2">
                <Link 
                  href="/deals"
                  className="w-full text-sm text-neutral-600 font-medium flex items-center justify-center"
                >
                  Manage Deals
                </Link>

                {user?.role === "deal_lead" && (
                  <Link 
                    href="/deals/new"
                    className="w-full text-sm text-primary font-medium flex items-center justify-center"
                  >
                    <span className="mr-1">+</span> Add New Deal
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
}