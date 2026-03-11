import { useEffect, useMemo, useState } from "react";
import PageLayout from "@/components/PageLayout";
import { api } from "@/api/client";

export default function Security() {
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState({});
  const [results, setResults] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    api.security.requirements().then((rows) => setRequirements(rows || [])).catch((e) => setError(e.message));
  }, []);

  const grouped = useMemo(() => {
    const map = new Map();
    requirements.forEach((r) => {
      const list = map.get(r.majorCategory) || [];
      list.push(r);
      map.set(r.majorCategory, list);
    });
    return Array.from(map.entries());
  }, [requirements]);

  const runSimulation = async (reqId) => {
    setLoading(true);
    setError("");
    try {
      const response = await api.security.simulate(reqId, inputs[reqId] || "");
      setResults((prev) => ({ ...prev, [reqId]: response }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Simulation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout
      title="Security (48 Scenarios)"
      description="Each REQ-COM scenario runs in controlled mode. Real exploit execution is blocked and replaced by learning logs."
    >
      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
      <div className="space-y-6">
        {grouped.map(([major, items]) => (
          <section key={major} className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-lg font-bold mb-3">{major}</h2>
            <div className="space-y-4">
              {items.map((r) => {
                const result = results[r.reqId];
                return (
                  <div key={r.reqId} className="rounded-lg border border-border/60 p-3">
                    <p className="text-sm font-semibold">{r.reqId} · {r.featureName}</p>
                    <p className="text-xs text-muted-foreground mt-1">{r.requirementText}</p>
                    <p className="text-xs text-orange-600 mt-1">{r.securityTopic}</p>
                    <div className="mt-2 flex flex-col md:flex-row gap-2">
                      <input
                        className="flex-1 border rounded px-3 py-2 text-sm"
                        placeholder="학습용 입력값"
                        value={inputs[r.reqId] || ""}
                        onChange={(e) => setInputs((prev) => ({ ...prev, [r.reqId]: e.target.value }))}
                      />
                      <button
                        className="px-4 py-2 rounded bg-primary text-white text-sm disabled:opacity-60"
                        onClick={() => runSimulation(r.reqId)}
                        disabled={loading}
                      >
                        Simulate
                      </button>
                    </div>
                    {result && (
                      <div className={`mt-3 rounded p-3 text-sm ${result.triggered ? "bg-amber-50" : "bg-emerald-50"}`}>
                        <p><strong>Status:</strong> {result.triggered ? "Risk Pattern Detected" : "Normal Input"}</p>
                        <p><strong>Message:</strong> {result.message}</p>
                        <p><strong>Simulated Result:</strong> {result.simulatedResult}</p>
                        <p><strong>Recommendation:</strong> {result.recommendation}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </PageLayout>
  );
}
