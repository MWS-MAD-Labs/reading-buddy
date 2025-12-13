import { LoginForm } from "@/components/auth/LoginForm";
import { getLatestLoginBroadcast } from "@/lib/broadcasts";

export default async function LoginPage() {
  const broadcast = await getLatestLoginBroadcast();

  return (
    <div className="w-full px-4 sm:px-6">
      <div className="flex justify-center">
        <LoginForm broadcast={broadcast} />
      </div>
    </div>
  );
}
