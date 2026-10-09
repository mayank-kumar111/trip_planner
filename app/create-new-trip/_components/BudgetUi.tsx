import React from 'react'

export const SelectBudgetOptions = [
    {
        id: 1,
        title: 'Cheap',
        desc: 'Stay conscious of costs',
        icon: '🤑',
        color: 'bg-green-100 text-green-600'
    },
    {
        id: 2,
        title: 'Moderate',
        desc: 'Keep cost on the average side',
        icon: '🪙',
        color: 'bg-yellow-100 text-yellow-600'
    },
    {
        id: 3,
        title: 'Luxury',
        desc: "Don't worry about cost",
        icon: '💸',
        color: 'bg-purple-100 text-purple-600'
    }
];

type BudgetUiProps = {
    onSelectedOption: (value: string) => void;
}

function BudgetUi({ onSelectedOption }: BudgetUiProps) {
    return (
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3'>
            {SelectBudgetOptions.map((item) => (
                <button
                    type='button'
                    key={item.id}
                    className='group p-4 border border-gray-200 rounded-2xl bg-white transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
                    onClick={() => onSelectedOption(`${item.title}: ${item.desc}`)}
                >
                    <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-3xl ${item.color}`}>{item.icon}</div>
                    <h2 className='mt-3 text-base font-semibold text-gray-900'>{item.title}</h2>
                    <p className='mt-1 text-sm leading-5 text-gray-500'>{item.desc}</p>
                    <span className='mt-2 inline-flex text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100'>Use this choice</span>
                </button>
            ))}
        </div>
    )
}

export default BudgetUi