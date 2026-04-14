import { AdminVersionsList } from "@/features/versions/components/admin-versions-list";
import { VersionDistributionChart } from "@/features/versions/components/version-distribution-chart";

export default function AdminVersionsPage() {
  return (
    <div className="space-y-6">
      <VersionDistributionChart />
      <AdminVersionsList />
    </div>
  );
}
