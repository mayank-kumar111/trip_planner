import React from 'react'

export const SelectTravelesList = [
    {
        id: 1,
        title: 'Just Me',
        desc: 'Perfect for a solo adventure',
        icon: '✈️',
        people: '1 person'
    },
    {
        id: 2,
        title: 'A Couple',
        desc: 'A trip for two travelers',
        icon: '🚶‍♂️',
        people: '2 people'
    },
    {
        id: 3,
        title: 'Family',
        desc: 'Great for a family getaway',
        icon: '🏡',
        people: '3 to 5 people'
    },
    {
        id: 4,
        title: 'Friends',
        desc: 'For a fun group adventure',
        icon: '⛵',
        people: '5 to 10 people'
    }
]

type GroupSizeUiProps = {
    onSelectedOption: (value: string) => void;
}

function GroupSizeUi({ onSelectedOption }: GroupSizeUiProps) {
    return (
        <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mt-3'>
            {SelectTravelesList.map((item) => (
                <button
                    type='button'
                    key={item.id}
                    className='group p-4 border border-gray-200 rounded-2xl bg-white text-left transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
                    onClick={() => onSelectedOption(`${item.title}: ${item.people}`)}
                >
                    <span className='text-2xl'>{item.icon}</span>
                    <span className='mt-2 block text-base font-semibold text-gray-900'>{item.title}</span>
                    <span className='mt-1 block text-xs leading-5 text-gray-500'>{item.desc}</span>
                    <span className='mt-2 inline-flex text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100'>Use this choice</span>
                </button>
            ))}
        </div>
    )
}

export default GroupSizeUi