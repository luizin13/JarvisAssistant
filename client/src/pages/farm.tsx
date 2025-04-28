import BusinessStats from "@/components/dashboard/business-stats";
import BusinessSuggestions from "@/components/dashboard/business-suggestions";
import MetaAdsSection from "@/components/dashboard/meta-ads-section";
import CreditOpportunities from "@/components/dashboard/credit-opportunities";
import NewsSection from "@/components/dashboard/news-section";

export default function FarmPage() {
  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">
          Fazenda
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Gerencie sua operação agrícola e obtenha insights valiosos.
        </p>
      </div>

      {/* Farm Stats */}
      <BusinessStats category="farm" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Farm Credit Opportunities */}
          <CreditOpportunities category="farm" />
          
          {/* Farm Business Suggestions */}
          <BusinessSuggestions category="farm" />
          
          {/* Farm Meta Ads */}
          <MetaAdsSection category="farm" />
        </div>
        
        <div className="space-y-6">
          {/* Farm News */}
          <NewsSection category="farm" />
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-heading font-medium text-gray-900 dark:text-white">Safra Atual</h2>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Soja</span>
                  <span className="text-sm font-medium text-green-600">85%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div className="bg-green-600 h-2.5 rounded-full" style={{ width: '85%' }}></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Milho</span>
                  <span className="text-sm font-medium text-amber-600">60%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div className="bg-amber-500 h-2.5 rounded-full" style={{ width: '60%' }}></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Café</span>
                  <span className="text-sm font-medium text-blue-600">40%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '40%' }}></div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Previsão Colheita:</span>
                    <span className="font-medium text-gray-900 dark:text-white">23 de Junho, 2023</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-gray-600 dark:text-gray-400">Área Total:</span>
                    <span className="font-medium text-gray-900 dark:text-white">1,250 hectares</span>
                  </div>
                  <button className="w-full bg-secondary-500 hover:bg-secondary-600 text-white py-2 rounded-md text-sm font-medium mt-4">
                    Ver detalhes da safra
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
