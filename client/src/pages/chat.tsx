import ChatBox from "@/components/chat/chat-box";

export default function ChatPage() {
  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">
          Assistente IA
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Converse com o assistente sobre seus negócios e obtenha insights valiosos.
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Chat interface with increased height for dedicated page */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div style={{ height: "calc(100vh - 220px)", minHeight: "500px" }}>
            <ChatBox />
          </div>
        </div>
        
        <div className="mt-6 space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Perguntas Sugeridas:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <button className="text-left p-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-sm">
                Como posso reduzir os custos operacionais da minha transportadora?
              </button>
              <button className="text-left p-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-sm">
                Quais são as melhores opções de financiamento para renovação de frota?
              </button>
              <button className="text-left p-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-sm">
                Quais tecnologias podem aumentar a produtividade na fazenda?
              </button>
              <button className="text-left p-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-sm">
                Como encontrar licitações adequadas para meus caminhões?
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
