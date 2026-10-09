import { createContext, type Dispatch, type SetStateAction } from "react";
import type { Id } from "@/convex/_generated/dataModel";

export type UserDetail = {
  _id: Id<"UserTable">;
  name: string;
  imageUrl: string;
  email: string;
  clerkId?: string;
};

export type UserDataContextType = {
  userDetail: UserDetail | undefined;
  setUserDetail: Dispatch<SetStateAction<UserDetail | undefined>>;
};

export const UserDataContext = createContext<UserDataContextType | undefined>(undefined);
