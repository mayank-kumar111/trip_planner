"use client"

import React from 'react';
import { useAuth } from '@clerk/nextjs';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Link from 'next/link'
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUserDetail } from '../provider';
import { TripInfo } from '../create-new-trip/_components/ChatBox';
import MyTripCardItem from './_components/MyTripCardItem';
import UsageCard from './_components/UsageCard';

export type Trip = {
    tripId: string,
    tripDetail: TripInfo,
    _id: string
};

function MyTripsPage() {
    const { isLoaded, isSignedIn } = useAuth();
    const { userDetail } = useUserDetail();
    const DeleteTrip = useMutation(api.tripDetail.DeleteTrip);

    const tripsResult = useQuery(
        api.tripDetail.GetUserTrips,
        isLoaded && isSignedIn && userDetail?._id ? { uid: userDetail._id } : "skip"
    );

    if (!isLoaded) return <div className='px-10 p-10 md:px-24 lg:px-48'><p className='text-gray-500'>Checking your sign-in status…</p></div>;
    if (!isSignedIn) return <div className='flex min-h-[60vh] items-center justify-center px-4'><div className='w-full max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm'><h1 className='text-2xl font-semibold'>Sign in required</h1><p className='mt-2 text-sm text-gray-600'>Please sign in to view your saved trips.</p><Link href='/sign-in' className='mt-5 inline-flex'><Button>Sign in</Button></Link></div></div>;
    const myTrips = (tripsResult as Trip[] | undefined) ?? [];
    // Show loading while userDetail hasn't synced yet OR while the query is in-flight.
    // Without this, the page flashes "No Trips Found" before the user context is ready.
    const loading = !userDetail?._id || tripsResult === undefined;

    const handleDelete = async (tripId: string) => {
        await DeleteTrip({ tripId });
    };

    return (
        <div className='px-10 p-10 md:px-24 lg:px-48'>
            <h2 className='text-3xl font-bold mb-5'>My Trips</h2>
            <UsageCard />

            {loading ? (
                <div className='flex items-center justify-center mt-10'>
                    <p className='text-gray-500'>Loading your trips…</p>
                </div>
            ) : myTrips.length === 0 ? (
                <div className='flex flex-col items-center justify-center gap-5 mt-10 border p-10 rounded-2xl'>
                    <Image src="/no_trips.svg" alt="No Trips" width={200} height={200} />
                    <h2 className='text-xl font-semibold'>No Trips Found</h2>
                    <p className='text-gray-600'>Looks like you haven&apos;t created any trips yet.</p>
                    <Link href={'/create-new-trip'}>
                        <Button>Create New Trip</Button>
                    </Link>
                </div>
            ) : (
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-7'>
                    {myTrips.map((trip) => (
                        <MyTripCardItem key={trip.tripId} trip={trip} onDelete={handleDelete} />
                    ))}
                </div>
            )}
        </div>
    )
}

export default MyTripsPage
