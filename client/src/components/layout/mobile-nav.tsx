import { Link, useLocation } from "wouter";
import { useTheme } from "@/lib/theme-provider";

interface MobileNavProps {
  onOpenMenu: () => void;
}

export default function MobileNav({ onOpenMenu }: MobileNavProps) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };
  
  const isActive = (href: string) => {
    return location === href;
  };
  
  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 fixed top-0 left-0 right-0 z-10">
        <div className="flex items-center justify-between h-16 px-4">
          <button className="p-1 rounded-md text-gray-500 dark:text-gray-400" onClick={onOpenMenu}>
            <i className="ri-menu-line text-xl"></i>
          </button>
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white">
              <i className="ri-robot-line text-lg"></i>
            </div>
            <h1 className="ml-2 text-lg font-heading font-semibold dark:text-white">AssistenteAI</h1>
          </div>
          <button 
            onClick={toggleTheme}
            className="p-1 rounded-md text-gray-500 dark:text-gray-400"
          >
            <i className="ri-moon-line dark:hidden text-xl"></i>
            <i className="ri-sun-line hidden dark:block text-xl"></i>
          </button>
        </div>
      </div>

      {/* Mobile Navigation Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-10">
        <div className="flex items-center justify-around h-16">
          <Link 
            href="/" 
            className={`flex flex-col items-center justify-center ${isActive("/") ? "text-primary-500 dark:text-primary-400" : "text-gray-500 dark:text-gray-400"}`}
          >
            <i className="ri-dashboard-line text-xl"></i>
            <span className="text-xs mt-1">Dashboard</span>
          </Link>
          <Link 
            href="/chat"
            className={`flex flex-col items-center justify-center ${isActive("/chat") ? "text-primary-500 dark:text-primary-400" : "text-gray-500 dark:text-gray-400"}`}
          >
            <i className="ri-message-3-line text-xl"></i>
            <span className="text-xs mt-1">Chat</span>
          </Link>
          <Link 
            href="/transport"
            className={`flex flex-col items-center justify-center ${isActive("/transport") ? "text-primary-500 dark:text-primary-400" : "text-gray-500 dark:text-gray-400"}`}
          >
            <i className="ri-truck-line text-xl"></i>
            <span className="text-xs mt-1">Transporte</span>
          </Link>
          <Link 
            href="/farm"
            className={`flex flex-col items-center justify-center ${isActive("/farm") ? "text-primary-500 dark:text-primary-400" : "text-gray-500 dark:text-gray-400"}`}
          >
            <i className="ri-plant-line text-xl"></i>
            <span className="text-xs mt-1">Fazenda</span>
          </Link>
        </div>
      </div>
    </>
  );
}
