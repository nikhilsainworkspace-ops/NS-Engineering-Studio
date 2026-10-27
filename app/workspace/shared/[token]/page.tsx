import SharedRoomViewer from "@/modules/civil-at-hand/components/shared-room-viewer";
import { brand } from "@/modules/civil-at-hand/lib/brand";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  return { title: `Secure shared data | ${brand.name}`, robots: { index: false, follow: false }, referrer: "no-referrer" as const };
}
type Props = { params: Promise<{ token: string }> };
export default async function SharedPage({ params }: Props) {
  const { token } = await params;
  return <SharedRoomViewer token={token} />;
}
