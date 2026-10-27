import PublicIntakeForm from "@/modules/civil-at-hand/components/public-intake-form";
import { brand } from "@/modules/civil-at-hand/lib/brand";
export const dynamic = "force-dynamic";
export async function generateMetadata() { return { title: `Shared form | ${brand.name}`, robots: { index: false, follow: false } }; }
type Props = { params: Promise<{ token: string }> };
export default async function JoinPage({ params }: Props) {
  const { token } = await params;
  return <PublicIntakeForm token={token} />;
}
