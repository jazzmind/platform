import KnowledgebaseApp from '../components/KnowledgebaseApp';

export default function Home() {
  return (
    <main className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Knowledgebase</h1>
        <p className="text-gray-600">Document management and semantic search platform</p>
      </div>
      
      <KnowledgebaseApp 
        entityType="knowledgebase"
        entityId="default"
        organizationId="default-org"
      />
      
      <div className="mt-8 text-sm text-gray-600">
        <h2 className="font-semibold">Development Mode</h2>
        <p>This page is for standalone development. The component can also be imported into composition platforms.</p>
      </div>
    </main>
  );
}
