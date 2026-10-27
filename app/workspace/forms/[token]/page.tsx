import CustomPublicForm from "@/modules/civil-at-hand/components/custom-public-form";
import { brand } from "@/modules/civil-at-hand/lib/brand";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  return { title: "Custom form | " + brand.name, robots: { index: false, follow: false } };
}
type Props = { params: Promise<{ token: string }> };
export default async function CustomFormPage({ params }: Props) {
  const { token } = await params;
  return <CustomPublicForm token={token} />;
}
