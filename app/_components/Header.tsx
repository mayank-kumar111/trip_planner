"use client"
import { Button } from '@/components/ui/button'
import { SignInButton, useUser, UserButton } from '@clerk/nextjs'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

const menuOptions = [
  {
    name: 'Home',
    path: '/'
  },
  {
    name: 'Pricing',
    path: '/pricing'
  },
  {
    name: 'Contact Us',
    path: '/contact-us'
  }
]

function Header() {

  const { user } = useUser();
  const path = usePathname();

  // Hide header on specific routes
  if (path === '/sign-in' || path === '/sign-up' || path === '/forgot-password') {
    return null;
  }

  return (
    <div className='flex justify-between items-center p-4 shadow-md'>
      {/* Logo */}
      <div className='flex items-center gap-2'>
        <Image src="/logo.svg" alt="Logo" width={30} height={30} />
        <h2 className='text-2xl font-bold'>Trip Planner</h2>
      </div>
      {/* Menu Options */}
      <div className='flex items-center gap-8'>
        {menuOptions.map((menu) => (
          <Link key={menu.path} href={menu.path}>
            <h2 className='text-lg hover:scale-105 transition-all hover:text-primary'>{menu.name}</h2>
          </Link>
        ))}
      </div>
      {/* Get Started Button */}
      <div className='flex items-center gap-5'>
        {(() => {
          if (!user) {
            return (
              <SignInButton mode="modal">
                <Button>
                  Get Started
                </Button>
              </SignInButton>
            );
          } else if (path === '/create-new-trip') {
            return (
              <Link href={'/my-trips'}>
                <Button>
                  My Trips
                </Button>
              </Link>
            );
          } else {
            return (
              <Link href={'/create-new-trip'}>
                <Button>
                  Create New Trip
                </Button>
              </Link>
            );
          }
        })()}
        <UserButton />
      </div>
    </div >
  )
}

export default Header