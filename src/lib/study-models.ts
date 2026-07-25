import type { MemberId } from "./types";

export type StudyFieldKey = "title" | "name" | "year" | "scripture" | "labels" | "links" | "memo";

export type StudyCategory = {
  id: string;
  scope: "personal" | "couple";
  name: string;
  enabledFields: StudyFieldKey[];
  customFields: string[];
  createdAt: string;
  updatedAt: string;
};

export type StudyEntryValues = {
  title?: string;
  name?: string;
  year?: string;
  scripture?: string;
  labels?: string;
  links?: string;
  memo?: string;
  custom?: Record<string, string>;
};

export type StudyEntry = {
  id: string;
  scope: "personal" | "couple";
  categoryId: string;
  categoryName: string;
  ownerUid: string;
  ownerMemberId: MemberId;
  ownerName: string;
  visibility: "private" | "shared";
  status: "draft" | "complete";
  values: StudyEntryValues;
  createdAt: string;
  updatedAt: string;
};
