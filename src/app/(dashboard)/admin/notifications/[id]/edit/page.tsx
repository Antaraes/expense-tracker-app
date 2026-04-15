import { AdminAnnouncementForm } from "@/features/notifications/components/admin-announcement-form";

export default async function AdminEditNotificationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminAnnouncementForm notificationId={id} />;
}
