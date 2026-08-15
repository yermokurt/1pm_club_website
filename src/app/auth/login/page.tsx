import { AuthForm } from "@/components/auth/auth-form";
export default function LoginPage() {
  return (
    <main className="shell py-12">
      <AuthForm mode="login" />
    </main>
  );
}
