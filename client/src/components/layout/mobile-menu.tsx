import { useTheme } from "@/lib/theme-provider";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { 
  Home, MessageSquare, Mic, Briefcase, Tractor, 
  CreditCard, BarChart2, NewspaperIcon, Lightbulb, 
  Cpu, Settings, Brain, FileCode, Sparkles, RadioTower,
  ChevronDown, ChevronUp
} from "lucide-react";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
  expanded?: boolean;
}

// Reorganizando os itens em categorias mais intuitivas - mesma estrutura do sidebar
const initialNavSections: NavSection[] = [
  {
    id: "principal",
    label: "Principal",
    expanded: true,
    items: [
      { href: "/", label: "Dashboard", icon: <Home className="h-5 w-5" /> },
      { href: "/voice-assistant", label: "Assistente JARVIS", icon: <Mic className="h-5 w-5" /> },
    ]
  },
  {
    id: "negocios",
    label: "Seus Negócios",
    expanded: true,
    items: [
      { href: "/transport", label: "Transportadora", icon: <Briefcase className="h-5 w-5" /> },
      { href: "/farm", label: "Fazenda", icon: <Tractor className="h-5 w-5" /> },
      { href: "/credit", label: "Crédito", icon: <CreditCard className="h-5 w-5" /> },
      { href: "/meta-ads", label: "Anúncios Meta", icon: <BarChart2 className="h-5 w-5" /> }
    ]
  },
  {
    id: "informacoes",
    label: "Informações",
    expanded: true,
    items: [
      { href: "/news", label: "Notícias", icon: <NewspaperIcon className="h-5 w-5" /> },
      { href: "/suggestions", label: "Sugestões", icon: <Lightbulb className="h-5 w-5" /> },
      { href: "/government-bids", label: "Licitações", icon: <FileCode className="h-5 w-5" /> },
      { href: "/personal-guide", label: "Guia Pessoal", icon: <Sparkles className="h-5 w-5" /> },
    ]
  },
  {
    id: "sistema",
    label: "Sistema",
    expanded: false,
    items: [
      { href: "/intelligence", label: "Central de IA", icon: <Brain className="h-5 w-5" /> },
      { href: "/multi-agent", label: "Multi-Agente", icon: <Cpu className="h-5 w-5" /> },
      { href: "/system-settings", label: "Configurações", icon: <Settings className="h-5 w-5" /> },
      { href: "/system-orchestrator", label: "Orquestrador", icon: <RadioTower className="h-5 w-5" /> },
      { href: "/intensive-improvement", label: "Melhoria Intensiva", icon: <Sparkles className="h-5 w-5" /> },
      { href: "/privacy", label: "Privacidade", icon: <Settings className="h-5 w-5" /> }
    ]
  }
];

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const [location] = useLocation();
  const [navSections, setNavSections] = useState<NavSection[]>(initialNavSections);
  
  if (!isOpen) return null;
  
  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };
  
  const isActive = (href: string) => {
    return location === href;
  };
  
  const toggleSection = (sectionId: string) => {
    setNavSections(prevSections => 
      prevSections.map(section => 
        section.id === sectionId 
          ? { ...section, expanded: !section.expanded } 
          : section
      )
    );
  };
  
  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.href);
    return (
      <li key={item.href}>
        <Link 
          href={item.href}
          onClick={onClose}
          className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
            active 
              ? "bg-primary/10 text-primary-700 dark:text-primary-300 border border-primary/20" 
              : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          <span className="mr-3 flex-shrink-0">
            {item.icon}
          </span>
          {item.label}
        </Link>
      </li>
    );
  };
  
  return (
    <div className="lg:hidden fixed inset-0 z-20 bg-black/50 dark:bg-black/60" onClick={onClose}>
      <div className="w-72 h-full bg-white dark:bg-gray-900 overflow-y-auto" onClick={stopPropagation}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
              <i className="ri-robot-line text-lg"></i>
            </div>
            <h1 className="ml-2 text-lg font-heading font-semibold dark:text-white">JARVIS</h1>
          </div>
          <button className="p-1 rounded-md text-gray-500 dark:text-gray-400" onClick={onClose}>
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>
        
        <nav className="pt-2 pb-4">
          {navSections.map(section => (
            <div key={section.id} className="px-4 mb-4">
              <div 
                className="flex items-center justify-between cursor-pointer py-1" 
                onClick={() => toggleSection(section.id)}
              >
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {section.label}
                </p>
                <div className="text-gray-500 dark:text-gray-400">
                  {section.expanded ? 
                    <ChevronUp className="h-4 w-4" /> : 
                    <ChevronDown className="h-4 w-4" />
                  }
                </div>
              </div>
              
              {section.expanded && (
                <ul className="mt-2 space-y-2">
                  {section.items.map(renderNavItem)}
                </ul>
              )}
            </div>
          ))}
        </nav>
        
        <div className="border-t border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <span className="text-sm font-medium">L</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium dark:text-white">Luiz</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Administrador</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
