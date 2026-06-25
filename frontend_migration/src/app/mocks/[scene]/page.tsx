import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getMockScene, mockScenes } from "@/page/mocks/scenes";

type PageProps = {
  params: Promise<{
    scene: string;
  }>;
};

export function generateStaticParams() {
  return mockScenes.map((scene) => ({ scene: scene.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { scene: slug } = await params;
  const scene = getMockScene(slug);

  return {
    title: scene ? `${scene.title} - 로디 목업` : "로디 목업",
  };
}

export default async function Page({ params }: PageProps) {
  const { scene: slug } = await params;
  const scene = getMockScene(slug);

  if (!scene) notFound();

  redirect(`/mocks?scene=${scene.slug}`);
}
