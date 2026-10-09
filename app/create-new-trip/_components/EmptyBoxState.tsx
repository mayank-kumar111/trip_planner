import React from 'react'
import { Suggestions } from '@/app/_components/Hero'

type EmptyBoxStateProps = {
    onSelectOption: (value: string) => void;
}

function EmptyBoxState({ onSelectOption }: EmptyBoxStateProps) {
    return (
        <div className='mt-5'>
            <h2 className='font-bold text-3xl text-center'>Start planning new <strong className='text-primary'>Trip using AI</strong></h2>
            <p className='text-center text-gray-400 mt-2'>Chat with our AI to create your perfect trip itinerary.</p>

            <div className='flex flex-col gap-5 mt-7'>
                {Suggestions.map((suggestion) => (
                    <button
                        type="button"
                        key={suggestion.title}
                        onClick={() => onSelectOption(suggestion.title)}
                        className='flex items-center gap-2 border rounded-xl p-3 cursor-pointer hover:border-primary hover:text-primary text-left w-full'>
                        {suggestion.icon}
                        <h2 className='text-lg'>{suggestion.title}</h2>
                    </button>
                ))}
            </div>
        </div>
    )
}


export default EmptyBoxState