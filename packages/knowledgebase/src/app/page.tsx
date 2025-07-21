import KnowledgebaseApp from '../components/KnowledgebaseApp';

export default function Home() {
  return (
    <main>

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
