"use client";

import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
} from "firebase/auth";
import type { User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { get as getDatabaseValue, ref as databaseRef, set as setDatabaseValue, update as updateDatabaseValue } from "firebase/database";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { defaultReadingState } from "@/lib/defaults";
import { auth, db, isFirebaseConfigured, realtimeDb } from "@/lib/firebase";
import type {
  Household,
  HouseholdMember,
  JoinRequest,
  MemberId,
  UserProfile,
} from "@/lib/types";

type AppContextValue = {
  configured: boolean;
  loading: boolean;
  firebaseUser: User | null;
  profile: UserProfile | null;
  household: Household | null;
  householdMembers: HouseholdMember[];
  pendingRequest: JoinRequest | null;
  joinRequests: JoinRequest[];
  memberId: MemberId;
  partnerId: MemberId;
  memberNames: Record<MemberId, string>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  createHousehold: (input: { householdName: string; displayName: string; memberId: MemberId }) => Promise<void>;
  requestToJoin: (input: { inviteCode: string; displayName: string }) => Promise<void>;
  clearPendingJoin: () => Promise<void>;
  approveJoinRequest: (request: JoinRequest) => Promise<void>;
  rejectJoinRequest: (request: JoinRequest) => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

function nowIso() {
  return new Date().toISOString();
}

function createInviteCode(length = 8) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
}

function profileFromUser(user: User): UserProfile {
  const now = nowIso();
  return {
    uid: user.uid,
    email: user.email ?? "",
    displayName: user.displayName ?? "",
    photoURL: user.photoURL ?? "",
    createdAt: now,
    updatedAt: now,
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>([]);
  const [pendingRequest, setPendingRequest] = useState<JoinRequest | null>(null);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth || !db) {
      setLoading(false);
      return;
    }

    return onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setProfile(null);
      setHousehold(null);
      setHouseholdMembers([]);
      setPendingRequest(null);
      setJoinRequests([]);

      if (!user) {
        setLoading(false);
        return;
      }

      const userRef = doc(db!, "users", user.uid);
      const snapshot = await getDoc(userRef);
      if (!snapshot.exists()) {
        await setDoc(userRef, profileFromUser(user));
      } else {
        await setDoc(
          userRef,
          {
            email: user.email ?? snapshot.data().email ?? "",
            photoURL: user.photoURL ?? snapshot.data().photoURL ?? "",
            updatedAt: nowIso(),
          },
          { merge: true },
        );
      }

      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!db || !firebaseUser) return;
    return onSnapshot(doc(db!, "users", firebaseUser.uid), (snapshot) => {
      if (snapshot.exists()) {
        setProfile(snapshot.data() as UserProfile);
      }
    });
  }, [firebaseUser]);

  useEffect(() => {
    if (!db || !profile?.pendingHouseholdId || !firebaseUser || profile.householdId) {
      setPendingRequest(null);
      return;
    }

    const requestRef = doc(
      db,
      "households",
      profile.pendingHouseholdId,
      "joinRequests",
      firebaseUser.uid,
    );

    return onSnapshot(requestRef, async (snapshot) => {
      if (!snapshot.exists()) return;
      const request = { id: snapshot.id, ...snapshot.data() } as JoinRequest;
      setPendingRequest(request);
      if (request.status === "approved") {
        await updateDoc(doc(db!, "users", firebaseUser.uid), {
          householdId: profile.pendingHouseholdId,
          memberId: request.requestedMemberId,
          displayName: request.displayName,
          pendingHouseholdId: null,
          pendingInviteCode: null,
          updatedAt: nowIso(),
        });
      }
    });
  }, [firebaseUser, profile?.householdId, profile?.pendingHouseholdId]);

  useEffect(() => {
    if (!realtimeDb || !household || !firebaseUser || household.ownerUid !== firebaseUser.uid) return;
    const database = realtimeDb;
    const householdPresenceRef = databaseRef(database, `presenceHouseholds/${household.id}`);
    void getDatabaseValue(householdPresenceRef).then(async (snapshot) => {
      const members = Object.fromEntries(household.memberUids.map((uid) => [uid, true]));
      if (!snapshot.exists()) {
        await setDatabaseValue(householdPresenceRef, {
          ownerUid: firebaseUser.uid,
          members,
          reading: {},
        });
      } else {
        await updateDatabaseValue(databaseRef(database, `presenceHouseholds/${household.id}/members`), members);
      }
    }).catch(() => undefined);
  }, [firebaseUser, household]);

  useEffect(() => {
    if (!db || !profile?.householdId) {
      setHousehold(null);
      setHouseholdMembers([]);
      setJoinRequests([]);
      return;
    }

    const householdId = profile.householdId;
    const unsubHousehold = onSnapshot(doc(db!, "households", householdId), (snapshot) => {
      if (snapshot.exists()) {
        setHousehold({ id: snapshot.id, ...snapshot.data() } as Household);
      }
    });
    const unsubMembers = onSnapshot(collection(db!, "households", householdId, "members"), (snapshot) => {
      setHouseholdMembers(snapshot.docs.map((item) => item.data() as HouseholdMember));
    });
    const unsubRequests = onSnapshot(collection(db!, "households", householdId, "joinRequests"), (snapshot) => {
      setJoinRequests(
        snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() } as JoinRequest))
          .filter((item) => item.status === "pending")
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      );
    });

    return () => {
      unsubHousehold();
      unsubMembers();
      unsubRequests();
    };
  }, [profile?.householdId]);

  const signIn = useCallback(async () => {
    if (!auth) throw new Error("Firebase Authenticationが設定されていません。");
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "auth/popup-blocked" || code === "auth/cancelled-popup-request") {
        await signInWithRedirect(auth, provider);
        return;
      }
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    if (auth) await firebaseSignOut(auth);
  }, []);

  const createHousehold = useCallback(
    async (input: { householdName: string; displayName: string; memberId: MemberId }) => {
      if (!db || !firebaseUser) throw new Error("ログインが必要です。");
      const householdRef = doc(collection(db!, "households"));
      const inviteCode = createInviteCode();
      const inviteRef = doc(db!, "invites", inviteCode);
      const memberRef = doc(db!, "households", householdRef.id, "members", firebaseUser.uid);
      const readingRef = doc(db!, "households", householdRef.id, "app", "reading");
      const userRef = doc(db!, "users", firebaseUser.uid);
      const now = nowIso();
      const displayName = input.displayName.trim() || firebaseUser.displayName || "メンバー";
      const householdName = input.householdName.trim() || "わたしたちの家庭";
      const openMemberId: MemberId = input.memberId === "husband" ? "wife" : "husband";

      const batch = writeBatch(db!);
      batch.set(householdRef, {
        name: householdName,
        ownerUid: firebaseUser.uid,
        memberUids: [firebaseUser.uid],
        inviteCode,
        createdAt: now,
        updatedAt: now,
      });
      batch.set(inviteRef, {
        householdId: householdRef.id,
        householdName,
        createdBy: firebaseUser.uid,
        openMemberId,
        active: true,
        createdAt: now,
      });
      batch.set(memberRef, {
        uid: firebaseUser.uid,
        memberId: input.memberId,
        displayName,
        email: firebaseUser.email ?? "",
        photoURL: firebaseUser.photoURL ?? "",
        joinedAt: now,
      });
      batch.set(readingRef, defaultReadingState);
      batch.set(
        userRef,
        {
          householdId: householdRef.id,
          memberId: input.memberId,
          displayName,
          updatedAt: now,
        },
        { merge: true },
      );
      await batch.commit();

      if (realtimeDb) {
        const database = realtimeDb;
        await setDatabaseValue(databaseRef(database, `presenceHouseholds/${householdRef.id}`), {
          ownerUid: firebaseUser.uid,
          members: { [firebaseUser.uid]: true },
          reading: {},
        });
      }
    },
    [firebaseUser],
  );

  const requestToJoin = useCallback(
    async (input: { inviteCode: string; displayName: string }) => {
      if (!db || !firebaseUser) throw new Error("ログインが必要です。");
      const inviteCode = input.inviteCode.trim().toUpperCase();
      const inviteSnapshot = await getDoc(doc(db!, "invites", inviteCode));
      if (!inviteSnapshot.exists() || inviteSnapshot.data().active !== true) {
        throw new Error("招待コードが見つからないか、すでに使用済みです。");
      }
      const invite = inviteSnapshot.data() as {
        householdId: string;
        openMemberId: MemberId;
      };
      const now = nowIso();
      const displayName = input.displayName.trim() || firebaseUser.displayName || "メンバー";
      const requestRef = doc(db!, "households", invite.householdId, "joinRequests", firebaseUser.uid);
      const batch = writeBatch(db!);
      batch.set(requestRef, {
        requesterUid: firebaseUser.uid,
        displayName,
        email: firebaseUser.email ?? "",
        photoURL: firebaseUser.photoURL ?? "",
        inviteCode,
        requestedMemberId: invite.openMemberId,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });
      batch.set(
        doc(db!, "users", firebaseUser.uid),
        {
          displayName,
          pendingHouseholdId: invite.householdId,
          pendingInviteCode: inviteCode,
          updatedAt: now,
        },
        { merge: true },
      );
      await batch.commit();
    },
    [firebaseUser],
  );

  const clearPendingJoin = useCallback(async () => {
    if (!db || !firebaseUser || !profile?.pendingHouseholdId) return;
    const batch = writeBatch(db!);
    batch.delete(doc(db!, "households", profile.pendingHouseholdId, "joinRequests", firebaseUser.uid));
    batch.set(
      doc(db!, "users", firebaseUser.uid),
      { pendingHouseholdId: null, pendingInviteCode: null, updatedAt: nowIso() },
      { merge: true },
    );
    await batch.commit();
  }, [firebaseUser, profile?.pendingHouseholdId]);

  const approveJoinRequest = useCallback(
    async (request: JoinRequest) => {
      if (!db || !firebaseUser || !household) return;
      const householdRef = doc(db!, "households", household.id);
      const requestRef = doc(db!, "households", household.id, "joinRequests", request.requesterUid);
      const memberRef = doc(db!, "households", household.id, "members", request.requesterUid);
      const inviteRef = doc(db!, "invites", request.inviteCode);
      const now = nowIso();

      let realtimeMembershipAdded = false;
      const realtimeDatabase = realtimeDb;
      if (realtimeDatabase) {
        const database = realtimeDatabase;
        const householdPresenceRef = databaseRef(database, `presenceHouseholds/${household.id}`);
        const presenceSnapshot = await getDatabaseValue(householdPresenceRef);
        if (!presenceSnapshot.exists()) {
          await setDatabaseValue(householdPresenceRef, {
            ownerUid: firebaseUser.uid,
            members: {
              [firebaseUser.uid]: true,
              [request.requesterUid]: true,
            },
            reading: {},
          });
        } else {
          await updateDatabaseValue(databaseRef(database, `presenceHouseholds/${household.id}/members`), {
            [request.requesterUid]: true,
          });
        }
        realtimeMembershipAdded = true;
      }

      try {
        await runTransaction(db!, async (transaction) => {
          const householdSnapshot = await transaction.get(householdRef);
          const requestSnapshot = await transaction.get(requestRef);
          if (!householdSnapshot.exists() || !requestSnapshot.exists()) {
            throw new Error("参加申請が見つかりません。");
          }
          const householdData = householdSnapshot.data() as Household;
          const requestData = requestSnapshot.data() as JoinRequest;
          if (requestData.status !== "pending") return;
          if (householdData.memberUids.length >= 2) {
            throw new Error("この家庭グループにはすでに2人参加しています。");
          }
          transaction.update(householdRef, {
            memberUids: [...householdData.memberUids, request.requesterUid],
            updatedAt: now,
          });
          transaction.set(memberRef, {
            uid: request.requesterUid,
            memberId: request.requestedMemberId,
            displayName: request.displayName,
            email: request.email,
            photoURL: request.photoURL,
            joinedAt: now,
          });
          transaction.update(requestRef, { status: "approved", updatedAt: now });
          transaction.update(inviteRef, { active: false, usedAt: now });
        });
      } catch (error) {
        if (realtimeDatabase && realtimeMembershipAdded) {
          await updateDatabaseValue(databaseRef(realtimeDatabase, `presenceHouseholds/${household.id}/members`), {
            [request.requesterUid]: null,
          });
        }
        throw error;
      }
    },
    [firebaseUser, household],
  );

  const rejectJoinRequest = useCallback(
    async (request: JoinRequest) => {
      if (!db || !household) return;
      await updateDoc(doc(db!, "households", household.id, "joinRequests", request.requesterUid), {
        status: "rejected",
        updatedAt: nowIso(),
      });
    },
    [household],
  );

  const updateDisplayName = useCallback(
    async (displayName: string) => {
      if (!db || !firebaseUser || !profile?.householdId || !profile.memberId) return;
      const clean = displayName.trim();
      if (!clean) return;
      const batch = writeBatch(db!);
      batch.set(
        doc(db!, "users", firebaseUser.uid),
        { displayName: clean, updatedAt: nowIso() },
        { merge: true },
      );
      batch.set(
        doc(db!, "households", profile.householdId, "members", firebaseUser.uid),
        { displayName: clean },
        { merge: true },
      );
      await batch.commit();
    },
    [firebaseUser, profile?.householdId, profile?.memberId],
  );

  const memberId = profile?.memberId ?? "husband";
  const partnerId: MemberId = memberId === "husband" ? "wife" : "husband";
  const memberNames = useMemo<Record<MemberId, string>>(() => {
    const names: Record<MemberId, string> = { husband: "夫", wife: "妻" };
    for (const member of householdMembers) names[member.memberId] = member.displayName;
    if (profile?.memberId && profile.displayName) names[profile.memberId] = profile.displayName;
    return names;
  }, [householdMembers, profile?.displayName, profile?.memberId]);

  const value = useMemo<AppContextValue>(
    () => ({
      configured: isFirebaseConfigured,
      loading,
      firebaseUser,
      profile,
      household,
      householdMembers,
      pendingRequest,
      joinRequests,
      memberId,
      partnerId,
      memberNames,
      signIn,
      signOut,
      createHousehold,
      requestToJoin,
      clearPendingJoin,
      approveJoinRequest,
      rejectJoinRequest,
      updateDisplayName,
    }),
    [
      loading,
      firebaseUser,
      profile,
      household,
      householdMembers,
      pendingRequest,
      joinRequests,
      memberId,
      partnerId,
      memberNames,
      signIn,
      signOut,
      createHousehold,
      requestToJoin,
      clearPendingJoin,
      approveJoinRequest,
      rejectJoinRequest,
      updateDisplayName,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useAppContext must be used within AppProvider");
  return value;
}
