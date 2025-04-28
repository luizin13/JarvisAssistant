import { useQuery } from "@tanstack/react-query";
import { User } from "@/lib/types";
import BusinessStats from "@/components/dashboard/business-stats";
import CreditOpportunities from "@/components/dashboard/credit-opportunities";
import MetaAdsSection from "@/components/dashboard/meta-ads-section";
import BusinessSuggestions from "@/components/dashboard/business-suggestions";
import NewsSection from "@/components/dashboard/news-section";
import ChatBox from "@/components/chat/chat-box";
import { ArrowUp, Award, Briefcase, LayoutDashboard, Sun, Coffee, Moon } from "lucide-react";

export default function Dashboard() {
  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ['/api/me'],
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: "Bom dia", icon: <Coffee className="h-5 w-5 text-orange-500" /> };
    if (hour < 18) return { text: "Boa tarde", icon: <Sun className="h-5 w-5 text-yellow-500" /> };
    return { text: "Boa noite", icon: <Moon className="h-5 w-5 text-indigo-500" /> };
  };

  const greeting = getGreeting();

  return (
    <div className="p-4 lg:p-6 animate-in fade-in duration-500">
      {/* Welcome Section */}
      <div className="mb-8 cognitive-group p-4 rounded-lg">
        <div className="flex items-center">
          <div className="p-2 rounded-full bg-primary/10 mr-3">
            <LayoutDashboard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold flex items-center group">
              <span className="mr-2 flex items-center">
                {greeting.text}{" "}
                <span className="ml-2 transform transition-transform group-hover:rotate-12">
                  {greeting.icon}
                </span>
              </span>
              <span className="cognitive-actionable">
                {userLoading ? "..." : user?.name || "Usuário"}
              </span>
              <span className="text-primary ml-1 transition-all duration-300">!</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Aqui está um resumo dos seus negócios hoje.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="cognitive-card-primary mb-8 rounded-lg">
        <BusinessStats />
      </div>

      {/* Split Dashboard View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 cognitive-container">
        {/* Left Column - Business Data */}
        <div className="lg:col-span-2 space-y-6">
          {/* Credit Opportunities */}
          <div className="cognitive-card transition-all hover:translate-y-[-4px]">
            <CreditOpportunities limit={2} />
          </div>
          
          {/* Meta Ads Section */}
          <div className="cognitive-card transition-all hover:translate-y-[-4px]">
            <MetaAdsSection limit={2} />
          </div>
          
          {/* Business Suggestions */}
          <div className="cognitive-card transition-all hover:translate-y-[-4px]">
            <BusinessSuggestions limit={2} />
          </div>
        </div>
        
        {/* Right Column - News & Chat */}
        <div className="space-y-6">
          {/* News Section */}
          <div className="cognitive-card transition-all hover:translate-y-[-4px]">
            <NewsSection limit={3} />
          </div>
          
          {/* Chat Box */}
          <div className="cognitive-card transition-all hover:translate-y-[-4px]">
            <ChatBox />
          </div>
        </div>
      </div>
      
      {/* Quick Stat Button - Fixed position */}
      <div className="fixed bottom-6 right-6 z-90">
        <button 
          className="cognitive-button-primary bg-primary text-primary-foreground p-4 rounded-full shadow-lg hover:shadow-xl transition-all"
          aria-label="Ver estatísticas rápidas"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
