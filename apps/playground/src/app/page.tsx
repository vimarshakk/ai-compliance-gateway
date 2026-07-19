import { ChatPlayground } from '@/components/ChatPlayground';
import { PipelineSidebar } from '@/components/PipelineSidebar';
import { ServiceStatus } from '@/components/ServiceStatus';
import { ModelSelector } from '@/components/ModelSelector';

export default function PlaygroundPage() {
  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
            ACG
          </div>
          <div>
            <h1 className="text-sm font-semibold">Playground</h1>
            <p className="text-xs text-gray-500">AI Compliance Gateway</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ModelSelector />
          <ServiceStatus />
        </div>
      </header>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          <ChatPlayground />
        </div>

        {/* Pipeline Sidebar */}
        <aside className="w-96 border-l border-gray-800 overflow-y-auto">
          <PipelineSidebar />
        </aside>
      </div>
    </div>
  );
}
