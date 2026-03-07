import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import { api } from "@/api/client";

export default function AccountRecovery() {
  const [searchParams] = useSearchParams();
  const modeParam = searchParams.get("mode");
  const activeMode = modeParam === "reset" ? "reset" : "id";

  const [findName, setFindName] = useState("");
  const [findEmail, setFindEmail] = useState("");
  const [findResult, setFindResult] = useState("");
  const [findError, setFindError] = useState("");

  const [resetEmail, setResetEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetResult, setResetResult] = useState("");
  const [resetError, setResetError] = useState("");

  const submitFindId = async (e) => {
    e.preventDefault();
    setFindError("");
    setFindResult("");
    try {
      const response = await api.auth.findId(findName, findEmail);
      const foundId = response?.foundId || "N/A";
      setFindResult(`\uC870\uD68C\uB41C \uC544\uC774\uB514: ${foundId}`);
    } catch (err) {
      setFindError(err instanceof Error ? err.message : "\uC544\uC774\uB514 \uCC3E\uAE30\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
    }
  };

  const submitResetRequest = async (e) => {
    e.preventDefault();
    setResetError("");
    setResetResult("");
    try {
      const response = await api.auth.requestPasswordReset(resetEmail);
      setResetResult(response?.message || "\uC778\uC99D\uCF54\uB4DC \uC694\uCCAD\uC774 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4.");
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "\uC778\uC99D\uCF54\uB4DC \uC694\uCCAD\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
    }
  };

  const submitResetConfirm = async (e) => {
    e.preventDefault();
    setResetError("");
    setResetResult("");
    try {
      await api.auth.confirmPasswordReset(resetEmail, resetToken, resetNewPassword);
      setResetResult("\uBE44\uBC00\uBC88\uD638\uAC00 \uBCC0\uACBD\uB418\uC5C8\uC2B5\uB2C8\uB2E4.");
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "\uBE44\uBC00\uBC88\uD638 \uBCC0\uACBD\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
    }
  };

  const inputClass =
    "w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15";

  return (
    <PageLayout hideIntro>
      <section className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-8">
        <h1 className="text-3xl font-extrabold tracking-tight">
          {activeMode === "id" ? "\uC544\uC774\uB514 \uCC3E\uAE30" : "\uBE44\uBC00\uBC88\uD638 \uC7AC\uC124\uC815"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {activeMode === "id"
            ? "\uC774\uB984\uACFC \uC774\uBA54\uC77C\uB85C \uC544\uC774\uB514\uB97C \uCC3E\uC744 \uC218 \uC788\uC2B5\uB2C8\uB2E4."
            : "\uC774\uBA54\uC77C \uC778\uC99D\uCF54\uB4DC\uB85C \uBE44\uBC00\uBC88\uD638\uB97C \uC7AC\uC124\uC815\uD569\uB2C8\uB2E4."}
        </p>

        {activeMode === "id" ? (
          <form onSubmit={submitFindId} className="mt-6 space-y-3">
            <input className={inputClass} placeholder={"\uC774\uB984"} value={findName} onChange={(e) => setFindName(e.target.value)} />
            <input type="email" className={inputClass} placeholder={"\uC774\uBA54\uC77C"} value={findEmail} onChange={(e) => setFindEmail(e.target.value)} />
            <button className="w-full rounded-xl bg-primary py-3 text-base font-bold text-primary-foreground transition-opacity hover:opacity-90">
              {"\uC544\uC774\uB514 \uCC3E\uAE30"}
            </button>
            {findResult && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{findResult}</p>}
            {findError && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{findError}</p>}
          </form>
        ) : (
          <>
            <form onSubmit={submitResetRequest} className="mt-6 space-y-3">
              <input type="email" className={inputClass} placeholder={"\uC774\uBA54\uC77C"} value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
              <button className="w-full rounded-xl border border-slate-300 bg-slate-50 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100">
                {"\uC778\uC99D\uCF54\uB4DC \uC694\uCCAD"}
              </button>
            </form>

            <form onSubmit={submitResetConfirm} className="mt-3 space-y-3">
              <input className={inputClass} placeholder={"\uC778\uC99D\uCF54\uB4DC"} value={resetToken} onChange={(e) => setResetToken(e.target.value)} />
              <input type="password" className={inputClass} placeholder={"\uC0C8 \uBE44\uBC00\uBC88\uD638"} value={resetNewPassword} onChange={(e) => setResetNewPassword(e.target.value)} />
              <button className="w-full rounded-xl bg-primary py-3 text-base font-bold text-primary-foreground transition-opacity hover:opacity-90">
                {"\uBE44\uBC00\uBC88\uD638 \uBCC0\uACBD"}
              </button>
              {resetResult && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{resetResult}</p>}
              {resetError && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{resetError}</p>}
            </form>
          </>
        )}

        <p className="mt-4 text-sm text-muted-foreground">
          <Link to="/login" className="font-semibold text-primary hover:underline">
            {"\uB85C\uADF8\uC778\uC73C\uB85C \uB3CC\uC544\uAC00\uAE30"}
          </Link>
        </p>
      </section>
    </PageLayout>
  );
}
