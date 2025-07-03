"use server";

import { promises as fs } from "fs";
import path from "path";
import type {
  logoContentPolicyCheck,
  type LogoContentPolicyCheckOutput,
} from "@/ai/flows/logo-content-policy-check";
import type { Garment } from "@/lib/types";

// --- Database setup ---
const dbPath = path.join(process.cwd(), "garments.json");

async function readGarments(): Promise<Garment[]> {
  try {
    const data = await fs.readFile(dbPath, "utf-8");
    return JSON.parse(data) as Garment[];
  } catch (error: any) {
    if (error.code === "ENOENT") {
      // If the file doesn't exist, create it with an empty array
      await writeGarments([]);
      return [];
    }
    console.error("Error reading garments DB:", error);
    throw new Error("Could not read garments database.");
  }
}

async function writeGarments(garments: Garment[]): Promise<void> {
  try {
    await fs.writeFile(dbPath, JSON.stringify(garments, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing garments DB:", error);
    throw new Error("Could not write to garments database.");
  }
}

// --- Garment Actions ---

export async function getGarmentsAction(): Promise<Garment[]> {
  return await readGarments();
}

export async function getGarmentAction(id: string): Promise<Garment | null> {
  const garments = await readGarments();
  return garments.find((g) => g.id === id) || null;
}

export async function saveGarmentAction(
  garmentToSave: Garment
): Promise<Garment> {
  const garments = await readGarments();
  let updatedGarment = { ...garmentToSave };

  const existingIndex = garments.findIndex((g) => g.id === garmentToSave.id);

  if (existingIndex > -1) {
    // Update existing garment
    garments[existingIndex] = updatedGarment;
  } else {
    // Create new garment with a new ID
    updatedGarment = { ...garmentToSave, id: crypto.randomUUID() };
    garments.push(updatedGarment);
  }

  await writeGarments(garments);
  return updatedGarment;
}

// --- Logo Content Policy Check Action ---

export async function checkLogoAction(
  logoDataUri: string
): Promise<LogoContentPolicyCheckOutput> {
  // This is a dynamic import because the flow is not used on every request.
  const {
    logoContentPolicyCheck,
  } = require("@/ai/flows/logo-content-policy-check");

  if (!logoDataUri) {
    return { isSafe: false, reason: "No logo data provided." };
  }

  try {
    const result = await logoContentPolicyCheck({ logoDataUri });
    return result;
  } catch (error) {
    console.error("Error in logo content policy check:", error);
    const reason =
      error instanceof Error ? error.message : "An unknown error occurred.";
    return {
      isSafe: false,
      reason: `An unexpected error occurred on the server: ${reason}`,
    };
  }
}
