import BusinessStats from "@/components/dashboard/business-stats";
import BusinessSuggestions from "@/components/dashboard/business-suggestions";
import MetaAdsSection from "@/components/dashboard/meta-ads-section";
import CreditOpportunities from "@/components/dashboard/credit-opportunities";
import NewsSection from "@/components/dashboard/news-section";

export default function TransportPage() {
  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">
          Transportadora
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Gerencie sua operação de transporte e obtenha insights valiosos.
        </p>
      </div>

      {/* Transport Stats */}
      <BusinessStats category="transport" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Transport Credit Opportunities */}
          <CreditOpportunities category="transport" />
          
          {/* Transport Business Suggestions */}
          <BusinessSuggestions category="transport" />
          
          {/* Transport Meta Ads */}
          <MetaAdsSection category="transport" />
        </div>
        
        <div className="space-y-6">
          {/* Transport News */}
          <NewsSection category="transport" />
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-heading font-medium text-gray-900 dark:text-white">Análise da Frota</h2>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Estado da Frota</span>
                  <span className="text-sm font-medium text-green-600">Bom</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div className="bg-green-600 h-2.5 rounded-full" style={{ width: '80%' }}></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Eficiência de Combustível</span>
                  <span className="text-sm font-medium text-amber-600">Média</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div className="bg-amber-500 h-2.5 rounded-full" style={{ width: '65%' }}></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Ociosidade</span>
                  <span className="text-sm font-medium text-red-600">Alta</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div className="bg-red-600 h-2.5 rounded-full" style={{ width: '30%' }}></div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button className="w-full bg-primary-500 hover:bg-primary-600 text-white py-2 rounded-md text-sm font-medium">
                    Ver relatório completo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
