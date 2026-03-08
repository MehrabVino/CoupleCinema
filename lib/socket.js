"use client";

import { getClientServices } from "@/lib/client/factories/createClientServices";

export function socketCreate(token) {
  return getClientServices().socketAdapter.connect(token);
}

