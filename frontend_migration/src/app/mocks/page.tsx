import type { Metadata } from "next";

import { MocksPage } from "@/page/mocks/page";
import { getMockScene } from "@/page/mocks/scenes";

export const metadata: Metadata = {
  title: "로디 목업",
};

type PageProps = {
  searchParams: Promise<{
    scene?: string | string[];
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  const sceneParam = (await searchParams).scene;
  const sceneSlug = Array.isArray(sceneParam) ? sceneParam[0] : sceneParam;
  const initialSceneSlug = sceneSlug && getMockScene(sceneSlug) ? sceneSlug : undefined;

  return <MocksPage initialSceneSlug={initialSceneSlug} />;
}
