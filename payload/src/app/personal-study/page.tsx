"use client";
import { PageHeader } from "@/components/PageHeader";
import { CustomStudyWorkspace } from "@/components/CustomStudyWorkspace";

export default function PersonalStudyPage() {
  return (
    <>
      <PageHeader title="じぶんの研究" subtitle="カテゴリーごとに入力欄を自由に作り、途中保存や家族共有ができます" />
      <CustomStudyWorkspace scope="personal" />
    </>
  );
}