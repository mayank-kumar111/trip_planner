import React from 'react'

export const SelectDaysList = [
    { id: 1, title: 'Weekend', desc: '2 to 3 days', icon: '📆', days: '2-3 days' },
    { id: 2, title: 'Short Trip', desc: '4 to 6 days', icon: '🗓️', days: '4-6 days' },
    { id: 3, title: 'One Week', desc: '7 days', icon: '🧳', days: '7 days' },
    { id: 4, title: 'Extended', desc: '10+ days', icon: '🌍', days: '10+ days' }
];

type SelectDaysUiProps = {
    onSelectedOption: (value: string) => void;
}

function SelectDaysUi({ onSelectedOption }: SelectDaysUiProps) {
    return (
        <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mt-3'>
            {SelectDaysList.map((item) => (
                <button
                    type='button'
                    key={item.id}
                    className='group p-4 border border-gray-200 rounded-2xl bg-white text-left transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
                    onClick={() => onSelectedOption(`${item.title}: ${item.days}`)}
                >
                    <span className='text-2xl'>{item.icon}</span>
                    <span className='mt-2 block text-base font-semibold text-gray-900'>{item.title}</span>
                    <span className='mt-1 block text-xs leading-5 text-gray-500'>{item.desc}</span>
                    <span className='mt-2 inline-flex text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100'>Use this choice</span>
                </button>
            ))}
        </div>
    );
}

export default SelectDaysUi