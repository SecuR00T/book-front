import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import { useAuth } from "@/context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const me = await login(username, password);
      if (me?.role === "ADMIN") {
        const adminUrl =
          window.location.port === "3000"
            ? `http://${window.location.hostname}:18080`
            : `${window.location.origin}/admin/`;
        window.location.href = adminUrl;
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "\uB85C\uADF8\uC778\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
    }
  };

  return (
    <PageLayout hideIntro>
      <section className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-8">
        <h1 className="text-3xl font-extrabold tracking-tight">{"\uB85C\uADF8\uC778"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{"\uC544\uC774\uB514\uC640 \uBE44\uBC00\uBC88\uD638\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694."}</p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <input
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
            placeholder={"\uC544\uC774\uB514"}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
            placeholder={"\uBE44\uBC00\uBC88\uD638"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <button className="w-full rounded-xl bg-primary py-3 text-base font-bold text-primary-foreground transition-opacity hover:opacity-90">
            {"\uB85C\uADF8\uC778"}
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <Link
              to="/account-recovery?mode=id"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-slate-50 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
            >
              {"\uC544\uC774\uB514 \uCC3E\uAE30"}
            </Link>
            <Link
              to="/account-recovery?mode=reset"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-slate-50 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
            >
              {"\uBE44\uBC00\uBC88\uD638 \uC7AC\uC124\uC815"}
            </Link>
          </div>
        </form>

        <p className="mt-4 text-sm text-muted-foreground">
          {"\uC544\uC9C1 \uACC4\uC815\uC774 \uC5C6\uB098\uC694?"}{" "}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            {"\uD68C\uC6D0\uAC00\uC785"}
          </Link>
        </p>
      </section>
    </PageLayout>
  );
}
