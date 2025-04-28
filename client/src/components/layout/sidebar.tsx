import { useTheme } from "@/lib/theme-provider";
import { Link, useLocation } from "wouter";
import { 
  Home, MessageSquare, Mic, Briefcase, Tractor, 
  CreditCard, BarChart2, NewspaperIcon, Lightbulb, 
  Cpu, Settings, Brain, FileCode, Sparkles, RadioTower
} from "lucide-react";
import { useState } from "react";

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

// Reorganizando os itens em categorias mais intuitivas
const navSections: NavSection[] = [
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
    expanded: false, // Começa recolhido
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

export default function Sidebar() {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const [sections, setSections] = useState(navSections);
  
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };
  
  const isActive = (href: string) => {
    return location === href;
  };
  
  const toggleSection = (sectionId: string) => {
    setSections(prevSections => 
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
          className={`flex items-center px-3 py-2 text-sm font-medium rounded-md commander-nav-item ${
            active 
              ? "commander-nav-active" 
              : "text-blue-100/70 hover:commander-nav-hover"
          }`}
        >
          <span className={`mr-3 ${active ? 'text-blue-400' : 'text-blue-300/70'}`}>
            {item.icon}
          </span>
          {item.label}
        </Link>
      </li>
    );
  };
  
  return (
    <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 border-r commander-border bg-transparent dark:bg-gray-900/70 shadow-sm z-10 jarvis-sidebar">
      <div className="flex items-center justify-between h-16 px-4 border-b commander-border">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full commander-logo-container flex items-center justify-center text-white">
            <i className="ri-robot-line text-xl"></i>
          </div>
          <h1 className="ml-3 text-lg font-heading font-semibold text-blue-400 jarvis-text-glow">JARVIS</h1>
        </div>
      </div>
      
      <nav className="flex-1 pt-4 pb-4 overflow-y-auto">
        {sections.map(section => (
          <div key={section.id} className="px-4 mb-4">
            <div 
              className="flex items-center justify-between cursor-pointer group" 
              onClick={() => toggleSection(section.id)}
            >
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {section.label}
              </p>
              <div className="text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <i className={`ri-${section.expanded ? 'arrow-up' : 'arrow-down'}-s-line text-xs`}></i>
              </div>
            </div>
            
            {section.expanded && (
              <ul className="mt-2 space-y-1">
                {section.items.map(renderNavItem)}
              </ul>
            )}
          </div>
        ))}
      </nav>
      
      <div className="border-t commander-border p-4">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full commander-user-icon flex items-center justify-center text-blue-200">
            <span className="text-sm font-medium">L</span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-blue-300">Luiz</p>
            <p className="text-xs text-blue-200/70">Administrador</p>
          </div>
        </div>
        
        <div className="mt-3 flex items-center space-x-2">
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-md text-blue-300 hover:bg-blue-900/20 commander-button-icon"
          >
            <i className="ri-moon-line dark:hidden text-lg"></i>
            <i className="ri-sun-line hidden dark:block text-lg"></i>
          </button>
          <button className="p-2 rounded-md text-blue-300 hover:bg-blue-900/20 commander-button-icon">
            <i className="ri-settings-3-line text-lg"></i>
          </button>
          <button className="p-2 rounded-md text-blue-300 hover:bg-blue-900/20 commander-button-icon">
            <i className="ri-logout-box-r-line text-lg"></i>
          </button>
        </div>
      </div>
    </aside>
  );
}
