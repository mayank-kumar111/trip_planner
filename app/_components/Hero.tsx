"use client"
import HeroVideoDialog from '@/components/magicui/hero-video-dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useUser } from '@clerk/nextjs'
import { ArrowDown, Globe2, Landmark, Plane, Send } from 'lucide-react'
import React from 'react'
import { useRouter } from 'next/navigation'


export const Suggestions = [
    {
        title: 'Create a new trip for your next adventure',
        icon: <Globe2 className='text-blue-500 h-6 w-6' />
    },
    {
        title: 'Inspire me where to go next',
        icon: <Plane className='text-green-500 h-6 w-6' />
    },
    {
        title: 'Discover Hidden Gems',
        icon: <Landmark className='text-orange-500 h-6 w-6' />
    },
    {
        title: 'Adventure Destination',
        icon: <Globe2 className='text-yellow-600 h-6 w-6' />
    }
]

function Hero() {

    const { user } = useUser();
    const router = useRouter();

    const goToPlanner = () => {
        if (!user) {
            router.push('/sign-in');
            return;
        }
        router.push('/create-new-trip');
    };

    return (
        <div className='mt-24 flex flex-col items-center justify-center space-y-6'>
            {/* Content */}
            <div className='max-w-3xl w-full text-center space-y-6'>
                <h1 className='text-xl md:text-5xl font-bold'>Hey, I&apos;m your personal <span className='text-primary'>Trip Planner</span> </h1>
                <p className='text-lg'>Tell me what you want, and I&apos;ll help you plan it! Flights, Hotel, Trip Planner - all at your fingertips.</p>
            </div>
            {/* Input Box */}
            <div>
                <div className='border rounded-2xl p-4 shadow-2xl relative'>
                    <Textarea placeholder='Create a new trip for your next adventure' className='w-full h-28 bg-transparent border-none focus-visible:ring-0 shadow-none resize-none' />
                    <Button size={'icon'} className='absolute bottom-6 right-6' onClick={() => goToPlanner()}>
                        <Send /></Button>
                </div>
            </div>
            {/* Suggestion list */}
            <div className='flex items-center gap-5 overflow-x-auto p-4'>
                {Suggestions.map((suggestion) => (
                    <button
                        type='button'
                        key={suggestion.title}
                        onClick={() => goToPlanner()}
                        className='flex items-center gap-2 border rounded-full p-2 cursor-pointer hover:bg-primary hover:text-white transition-colors'>
                        {suggestion.icon}
                        <h2 className='text-sm'>{suggestion.title}</h2>
                    </button>
                ))}
            </div>

            {process.env.NEXT_PUBLIC_DEMO_VIDEO_URL && (
                <>
                    <h2 className='my-7 mt-14 flex gap-2'>Not Sure Where to start? <strong>Watch this video for inspiration!</strong> <ArrowDown /></h2>
                    <HeroVideoDialog
                        className="block dark:hidden w-full max-w-3xl mx-auto"
                        animationStyle="from-center"
                        videoSrc={process.env.NEXT_PUBLIC_DEMO_VIDEO_URL}
                        thumbnailSrc={process.env.NEXT_PUBLIC_DEMO_VIDEO_THUMBNAIL ?? ""}
                        thumbnailAlt="Trip Planner Demo Video"
                    />
                </>
            )}
        </div>
    )
}

export default Hero