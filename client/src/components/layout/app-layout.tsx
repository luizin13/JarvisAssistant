import { useState } from "react";
import Sidebar from "./sidebar";
import MobileMenu from "./mobile-menu";
import MobileNav from "./mobile-nav";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const openMobileMenu = () => setMobileMenuOpen(true);
  const closeMobileMenu = () => setMobileMenuOpen(false);
  
  return (
    <div className="min-h-screen flex flex-col lg:flex-row jarvis-main-interface">
      {/* Sidebar for desktop */}
      <Sidebar />
      
      {/* Mobile Navigation */}
      <MobileNav onOpenMenu={openMobileMenu} />
      
      {/* Mobile Menu (hidden by default) */}
      <MobileMenu isOpen={mobileMenuOpen} onClose={closeMobileMenu} />
      
      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pt-16 lg:pt-0 pb-16 lg:pb-0 commander-main-content">
        <div className="jarvis-content-overlay"></div>
        <div className="jarvis-content-container">
          {children}
        </div>
      </main>
    </div>
  );
}
