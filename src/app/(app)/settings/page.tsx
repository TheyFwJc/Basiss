import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProfileForm } from "./profile-form";
import { PreferencesForm } from "./preferences-form";

export default async function SettingsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    include: { settings: true },
  });

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Manage your profile and preferences."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Your name is shown throughout the app.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm name={user.name} email={user.email} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preferences</CardTitle>
          <CardDescription>
            Used to display dates and currency amounts consistently.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PreferencesForm
            timezone={user.settings?.timezone ?? "America/New_York"}
            baseCurrency={user.settings?.baseCurrency ?? "USD"}
          />
        </CardContent>
      </Card>
    </div>
  );
}
