import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { getMockScene, MockSceneShell, mockScenes } from "../mock-scenes"

type MockScenePageProps = {
  params: Promise<{
    scene: string
  }>
}

export function generateStaticParams() {
  return mockScenes.map((scene) => ({ scene: scene.slug }))
}

export async function generateMetadata({ params }: MockScenePageProps): Promise<Metadata> {
  const { scene: slug } = await params
  const scene = getMockScene(slug)

  if (!scene) {
    return {
      title: "목업 없음 - 로디",
    }
  }

  return {
    title: `${scene.title} - 로디 디자인 목업`,
    description: scene.description,
  }
}

export default async function MockScenePage({ params }: MockScenePageProps) {
  const { scene: slug } = await params
  const scene = getMockScene(slug)

  if (!scene) {
    notFound()
  }

  return <MockSceneShell scene={scene} />
}
