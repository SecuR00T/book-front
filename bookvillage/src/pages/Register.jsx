import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import { useAuth } from "@/context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    passwordConfirm: "",
    name: "",
    phone: "",
    address: "",
  });
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.username.trim()) {
      setError("\uC544\uC774\uB514\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.");
      return;
    }
    if (!form.name.trim()) {
      setError("\uC774\uB984\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694.");
      return;
    }
    if (!form.password) {
      setError("\uBE44\uBC00\uBC88\uD638\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.");
      return;
    }
    if (form.password !== form.passwordConfirm) {
      setError("\uBE44\uBC00\uBC88\uD638\uC640 \uBE44\uBC00\uBC88\uD638 \uD655\uC778\uC774 \uC77C\uCE58\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.");
      return;
    }

    try {
      await register({
        username: form.username.trim().toLowerCase(),
        email: form.email.trim(),
        password: form.password,
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
      });
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "\uD68C\uC6D0\uAC00\uC785\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
    }
  };

  const update = (key) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <PageLayout hideIntro>
      <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-6 sm:p-8">
        <h1 className="text-3xl font-extrabold tracking-tight">{"\uD68C\uC6D0\uAC00\uC785"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{"\uC544\uC774\uB514\uB97C \uD3EC\uD568\uD55C \uD68C\uC6D0 \uC815\uBCF4\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694."}</p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <input className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15" placeholder={"\uC544\uC774\uB514"} value={form.username} onChange={update("username")} />
          <input type="email" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15" placeholder={"\uC774\uBA54\uC77C"} value={form.email} onChange={update("email")} />
          <input className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15" placeholder={"\uC774\uB984"} value={form.name} onChange={update("name")} />
          <input type="password" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15" placeholder={"\uBE44\uBC00\uBC88\uD638"} value={form.password} onChange={update("password")} />
          <input type="password" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15" placeholder={"\uBE44\uBC00\uBC88\uD638 \uD655\uC778"} value={form.passwordConfirm} onChange={update("passwordConfirm")} />
          <input className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15" placeholder={"\uC804\uD654\uBC88\uD638"} value={form.phone} onChange={update("phone")} />
          <input className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15" placeholder={"\uC8FC\uC18C"} value={form.address} onChange={update("address")} />

          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <button className="w-full rounded-xl bg-primary py-3 text-base font-bold text-primary-foreground transition-opacity hover:opacity-90">{"\uAC00\uC785\uD558\uAE30"}</button>
        </form>

        <p className="mt-4 text-sm text-muted-foreground">
          {"\uC774\uBBF8 \uACC4\uC815\uC774 \uC788\uB098\uC694?"}{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">{"\uB85C\uADF8\uC778"}</Link>
        </p>
      </div>
    </PageLayout>
  );
}
