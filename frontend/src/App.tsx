import "./App.css";

function App() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="text-3xl font-bold text-green-700">Freshora</h1>

        <p className="mt-3 text-slate-600">
          Fruit & Vegetable Trading Management
        </p>

        <button className="mt-6 rounded-lg bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700">
          Setup successful
        </button>
      </section>
    </main>
  );
}

export default App;
