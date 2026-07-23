export type MemberId = "husband" | "wife";

export type ChapterRef = {
  bookId: string;
  chapter: number;
};

export type WeeklyMeetingRange = {
  weekStart: string;
  bookId: string;
  startChapter: number;
  endChapter: number;
  sourceUrl?: string;
};

export type ReadingRecord = {
  id: string;
  memberId: MemberId;
  ref: ChapterRef;
  mode: "meeting" | "normal";
  completedAt: string;
  note?: string;
};

export type MemberReadingState = {
  normalNext: ChapterRef;
  completedMeetingKeys: string[];
  history: ReadingRecord[];
  shareReadingPresence?: boolean;
};

export type CompanionProfile = {
  name: string;
};

export type ReadingState = {
  members: Record<MemberId, MemberReadingState>;
  weeklyRanges: WeeklyMeetingRange[];
  companion?: CompanionProfile;
};

export type ReadingPresence = {
  uid: string;
  memberId: MemberId;
  ref: ChapterRef;
  startedAt: string;
  updatedAt: string;
};

export type ReadingPresenceState = Partial<Record<MemberId, ReadingPresence>>;

export type CompanionMood = "excited" | "happy" | "content" | "sleepy" | "waiting";

export type CompanionStats = {
  mood: CompanionMood;
  moodLabel: string;
  message: string;
  energy: number;
  bond: number;
  totalChapters: number;
  stage: number;
  stageName: string;
  stageProgress: number;
  nextStageName?: string;
  chaptersToNextStage: number;
  unlockedItems: string[];
  latestUnlockedItem: string;
};

export type StudyPlan = {
  id: string;
  scheduledAt: string;
  theme: string;
  preparation: string;
  status: "planned" | "done" | "postponed";
  reflection: string;
  createdAt: string;
};

export type ResearchNote = {
  id: string;
  title: string;
  scripture: string;
  tags: string[];
  body: string;
  shared: boolean;
  author: MemberId;
  authorUid: string;
  createdAt: string;
  updatedAt: string;
};

export type MinistryItem = {
  id: string;
  title: string;
  category: string;
  scripture: string;
  link: string;
  note: string;
  createdAt: string;
  createdBy: string;
};

export type TaskItem = {
  id: string;
  title: string;
  dueDate: string;
  assignee: MemberId | "both";
  completed: boolean;
  createdAt: string;
  createdBy: string;
};

export type UserProfile = {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  householdId?: string | null;
  memberId?: MemberId | null;
  pendingHouseholdId?: string | null;
  pendingInviteCode?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Household = {
  id: string;
  name: string;
  ownerUid: string;
  memberUids: string[];
  inviteCode: string;
  createdAt: string;
  updatedAt: string;
};

export type HouseholdMember = {
  uid: string;
  memberId: MemberId;
  displayName: string;
  email: string;
  photoURL: string;
  joinedAt: string;
};

export type JoinRequest = {
  id: string;
  requesterUid: string;
  displayName: string;
  email: string;
  photoURL: string;
  inviteCode: string;
  requestedMemberId: MemberId;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
};
