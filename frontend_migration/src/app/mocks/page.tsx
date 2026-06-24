import type { Metadata } from "next";

import { MocksPage } from "@/page/mocks/page";

export const metadata: Metadata = {
  title: "로디 목업",
};

export default function Page() {
  return <MocksPage />;
}
