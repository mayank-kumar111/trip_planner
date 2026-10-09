"use client";

import React, { useContext, useEffect, useState } from "react";
import Header from "./_components/Header";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { UserDataContext, type UserDetail, type UserDataContextType } from "@/context/UserDetailContext";
import { TripContextType, TripDetailContext } from "@/context/TripDetailContext";
import { TripInfo } from "./create-new-trip/_components/ChatBox";

function Provider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const createUser = useMutation(api.user.CreateNewUser);
  const [userDetail, setUserDetail] = useState<UserDetail | undefined>();
  const [tripDetailInfo, setTripDetailInfo] = useState<TripInfo | null | undefined>(null);
  const { user, isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) {
      if (isLoaded && !isSignedIn) setUserDetail(undefined);
      return;
    }

    let cancelled = false;

    void createUser({
      email: user.primaryEmailAddress?.emailAddress ?? "",
      imageUrl: user.imageUrl ?? "",
      name: user.fullName ?? user.firstName ?? "Trip Planner User",
    })
      .then((result) => {
        if (!cancelled && result) setUserDetail(result as UserDetail);
      })
      .catch((error) => {
        console.error("User profile sync failed:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [createUser, isLoaded, isSignedIn, user]);

  const userContextValue: UserDataContextType = {
    userDetail,
    setUserDetail,
  };

  return (
    <UserDataContext.Provider value={userContextValue}>
      <TripDetailContext.Provider value={{ tripDetailInfo, setTripDetailInfo }}>
        <div>
          <Header />
          {children}
        </div>
      </TripDetailContext.Provider>
    </UserDataContext.Provider>
  );
}

export default Provider;

export const useUserDetail = (): UserDataContextType => {
  const context = useContext(UserDataContext);

  if (!context) {
    throw new Error("useUserDetail must be used inside the UserDataContext provider");
  }

  return context;
};

export const useTripDetail = (): TripContextType => {
  const context = useContext(TripDetailContext);

  if (!context) {
    throw new Error("useTripDetail must be used inside the TripDetailContext provider");
  }

  return context;
};
