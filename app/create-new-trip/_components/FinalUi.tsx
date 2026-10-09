import { Button } from '@/components/ui/button'
import { Check, Edit3, Globe } from 'lucide-react'
import React from 'react'

type FinalUiProps = {
    onSelect: (value: string, shouldGenerate?: boolean) => void;
    disabled?: boolean;
}

function FinalUi({ onSelect, disabled }: FinalUiProps) {
    return (
        <div className='mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm'>
            <div className='flex items-start gap-3'>
                <div className='rounded-xl bg-primary/10 p-2.5 text-primary'>
                    <Globe className='h-5 w-5' />
                </div>
                <div>
                    <h2 className='text-base font-semibold text-gray-900'>Your trip details are ready</h2>
                    <p className='mt-1 text-sm leading-6 text-gray-500'>Review what we collected. Choose an option to fill the message box, then press Enter.</p>
                </div>
            </div>

            <div className='mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3'>
                <Button
                    type='button'
                    disabled={disabled}
                    onClick={() => onSelect('Generate my trip', true)}
                    className='h-11 justify-center gap-2'
                >
                    <Check className='h-4 w-4' />
                    Generate my trip
                </Button>
                <Button
                    type='button'
                    disabled={disabled}
                    variant='outline'
                    onClick={() => onSelect('I want to change something', false)}
                    className='h-11 justify-center gap-2'
                >
                    <Edit3 className='h-4 w-4' />
                    Change something
                </Button>
            </div>
        </div>
    )
}

export default FinalUi
