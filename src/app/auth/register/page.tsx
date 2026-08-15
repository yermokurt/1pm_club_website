import { AuthForm } from "@/components/auth/auth-form";
export default function RegisterPage() {
  return (
    <main className="shell py-12">
      <AuthForm mode="register" />
    </main>
  );
}
