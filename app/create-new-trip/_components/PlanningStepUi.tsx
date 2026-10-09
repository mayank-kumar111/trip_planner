import React from "react";
import { Compass, Heart, MapPin, Sparkles, WalletCards } from "lucide-react";

type PlanningStepUiProps = {
    step: "origin" | "destination" | "interests" | "preferences";
    onSelectExample?: (value: string) => void;
};

const CONTENT = {
    origin: { title: "Start with your departure", description: "Share a city, airport, landmark, or area. We'll use it to make travel time and routing more realistic.", examples: ["Delhi", "Jaipur", "Mumbai Airport"], icon: MapPin },
    destination: { title: "Choose your destination", description: "You can enter a city, country, region, or a specific place you want to explore.", examples: ["Agra", "Goa", "Kerala"], icon: Compass },
    interests: { title: "Make the trip yours", description: "Tell us what you enjoy so the itinerary feels personal instead of generic.", examples: ["Culture & history", "Food & cafes", "Adventure"], icon: Heart },
    preferences: { title: "Add your finishing touches", description: "Mention anything important: accessibility, food preferences, pace, must-see places, or things to avoid.", examples: ["Vegetarian food", "Relaxed pace", "Avoid crowded places"], icon: Sparkles },
} as const;

export default function PlanningStepUi({ step, onSelectExample }: PlanningStepUiProps) {
    const content = CONTENT[step];
    const Icon = content.icon;
    return (
        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
                <div className="rounded-xl bg-primary/10 p-2.5 text-primary"><Icon className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><WalletCards className="h-4 w-4 text-gray-400" /><p className="font-semibold text-gray-900">{content.title}</p></div>
                    <p className="mt-1 text-sm leading-6 text-gray-500">{content.description}</p>
                    <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-400">Quick suggestion</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {content.examples.map((example) => (
                            <button type="button" key={example} onClick={() => onSelectExample?.(example)} className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-primary hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                {example}
                            </button>
                        ))}
                    </div>
                    <p className="mt-3 text-xs text-gray-400">Selecting a suggestion fills the message box only. Press Enter to continue.</p>
                </div>
            </div>
        </div>
    );
}
