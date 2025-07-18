import r2dtax from '../components/r2dtax';

export default function Home() {
  return (
    <main className="p-8">
      <r2dtax />
      <div className="mt-8 text-sm text-gray-600">
        <h2>Development Mode</h2>
        <p>This page is for standalone development. The component can also be imported into composition platforms.</p>
      </div>
    </main>
  );
}
