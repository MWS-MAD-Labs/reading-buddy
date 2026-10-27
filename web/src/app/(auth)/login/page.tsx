import { LoginForm } from "@/components/auth/LoginForm";
import { getLatestLoginBroadcast } from "@/lib/broadcasts";
import { isHubAuthEnabled } from "@/lib/central/hub-session";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const broadcast = await getLatestLoginBroadcast();
  const { error } = await searchParams;

  return (
    <div className="w-full px-4 sm:px-6">
      <div className="flex justify-center">
        <LoginForm
          broadcast={broadcast}
          hubAuthEnabled={isHubAuthEnabled()}
          authError={error ?? null}
        />
      </div>
    </div>
  );
}
