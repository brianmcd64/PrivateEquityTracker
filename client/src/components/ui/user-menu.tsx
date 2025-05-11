import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell } from "lucide-react";
import { useLocation } from "wouter";

export function UserMenu() {
  const { user, logoutMutation } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();

  // Role display names
  const roleNames = {
    deal_lead: "Deal Lead",
    functional_lead: "Functional Lead",
    partner: "Partner",
  };

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logoutMutation.mutate();
    navigate("/auth");
    setIsOpen(false);
  };

  if (!user) return null;

  // Get first letters of first and last name for avatar fallback
  const nameParts = user.name.split(" ");
  const initials = nameParts.length > 1
    ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
    : nameParts[0].substring(0, 2);

  return (
    <div className="flex items-center space-x-4">
      <div className="relative">
        <button className="flex items-center text-neutral-600 hover:text-primary focus:outline-none">
          <Bell className="h-6 w-6" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
      </div>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center focus:outline-none"
          aria-haspopup="true"
          aria-expanded={isOpen}
        >
          <span className="hidden md:block mr-2 text-sm font-medium">{user.name}</span>
          <span className="hidden md:block text-xs text-neutral-500">({roleNames[user.role as keyof typeof roleNames]})</span>
          <Avatar className="h-8 w-8 ml-2 border border-neutral-200">
            <AvatarFallback>{initials}</AvatarFallback>
            <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=eef2ff&color=4f46e5`} />
          </Avatar>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
            <a href="#" className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">
              Your Profile
            </a>
            <a href="#" className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">
              Settings
            </a>
            <button
              onClick={handleLogout}
              className="w-full text-left block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
