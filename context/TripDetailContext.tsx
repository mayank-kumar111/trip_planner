import { TripInfo } from "@/app/create-new-trip/_components/ChatBox";
import React, { createContext } from "react";

export type TripContextType = {
    tripDetailInfo: TripInfo | null | undefined,
    setTripDetailInfo: React.Dispatch<React.SetStateAction<TripInfo | null | undefined>>
}

export const TripDetailContext = createContext<TripContextType | undefined>(undefined);
