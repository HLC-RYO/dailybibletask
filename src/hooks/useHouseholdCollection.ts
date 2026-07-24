"use client";

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { db } from "@/lib/firebase";

export function useHouseholdCollection<T extends { id: string }>(collectionName: string) {
  const { household } = useAppContext();
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !household) return;
    return onSnapshot(collection(db!, "households", household.id, collectionName), (snapshot) => {
      setItems(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as T)));
      setLoading(false);
    });
  }, [collectionName, household]);

  const addItem = useCallback(
    async (item: T) => {
      if (!db || !household) return;
      const itemRef = doc(db!, "households", household.id, collectionName, item.id);
      const { id: _id, ...data } = item;
      await setDoc(itemRef, data);
    },
    [collectionName, household],
  );

  const updateItem = useCallback(
    async (id: string, patch: Partial<T>) => {
      if (!db || !household) return;
      const { id: _id, ...data } = patch;
      await updateDoc(doc(db!, "households", household.id, collectionName, id), data);
    },
    [collectionName, household],
  );

  const removeItem = useCallback(
    async (id: string) => {
      if (!db || !household) return;
      await deleteDoc(doc(db!, "households", household.id, collectionName, id));
    },
    [collectionName, household],
  );

  return { items, loading, addItem, updateItem, removeItem };
}
