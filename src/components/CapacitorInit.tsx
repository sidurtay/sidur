"use client";
import { useEffect } from "react";
import { initCapacitor } from "@/lib/capacitor";

export default function CapacitorInit() {
  useEffect(() => { initCapacitor(); }, []);
  return null;
}
