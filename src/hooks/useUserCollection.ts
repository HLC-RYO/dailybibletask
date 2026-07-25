"use client";

import { collection, deleteDoc, doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { db } from "@/lib/firebase";

/** A private collection stored beneath the signed-in user's document. */
export function useUserCollection<T extends { id: string }>(collectionName: string) {
  const { firebaseUser } = useAppContext();
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !firebaseUser) return;
    const firestore = db;
    return onSnapshot(collection(firestore, "users", firebaseUser.uid, collectionName), (snapshot) => {
      setItems(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as T)));
      setLoading(false);
    });
  }, [collectionName, firebaseUser]);

  const addItem = useCallback(async (item: T) => {
    if (!db || !firebaseUser) return;
    const firestore = db;
    const itemRef = doc(firestore, "users", firebaseUser.uid, collectionName, item.id);
    const { id: _id, ...data } = item;
    await setDoc(itemRef, data);
  }, [collectionName, firebaseUser]);

  const updateItem = useCallback(async (id: string, patch: Partial<T>) => {
    if (!db || !firebaseUser) return;
    const firestore = db;
    const { id: _id, ...data } = patch;
    await updateDoc(doc(firestore, "users", firebaseUser.uid, collectionName, id), data);
  }, [collectionName, firebaseUser]);

  const removeItem = useCallback(async (id: string) => {
    if (!db || !firebaseUser) return;
    const firestore = db;
    await deleteDoc(doc(firestore, "users", firebaseUser.uid, collectionName, id));
  }, [collectionName, firebaseUser]);

  return { items, loading, addItem, updateItem, removeItem };
}
