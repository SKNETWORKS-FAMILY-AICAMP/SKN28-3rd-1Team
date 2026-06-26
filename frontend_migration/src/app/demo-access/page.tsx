import { DemoAccessPage } from "@/page/demo-access/page";

type DemoAccessRoutePageProps = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

export default async function DemoAccessRoutePage({
  searchParams,
}: DemoAccessRoutePageProps) {
  const resolvedSearchParams = await searchParams;
  return <DemoAccessPage nextPath={resolvedSearchParams?.next} />;
}
