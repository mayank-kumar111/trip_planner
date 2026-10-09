"use client";
import React from "react";
import { Carousel, Card } from "@/components/ui/apple-cards-carousel";

export function PopularCityList() {
    const cards = data.map((card, index) => (
        <Card key={card.src} card={card} index={index} />
    ));

    return (
        <div className="w-full h-full py-20">
            <h2 className="max-w-7xl pl-4 mx-auto text-xl md:text-5xl font-bold text-neutral-800 dark:text-neutral-200 font-sans">
                Popular Destinations to Explore
            </h2>
            <Carousel items={cards} />
        </div>
    );
}

function DestinationContent({ description, highlights }: { description: string; highlights: string[] }) {
    return (
        <div className="bg-[#F5F5F7] dark:bg-neutral-800 p-8 md:p-14 rounded-3xl mb-4">
            <p className="text-neutral-600 dark:text-neutral-400 text-base md:text-xl font-sans max-w-3xl mx-auto leading-relaxed">
                {description}
            </p>
            <ul className="mt-6 space-y-2 max-w-3xl mx-auto">
                {highlights.map((highlight) => (
                    <li key={highlight} className="flex items-start gap-2 text-neutral-600 dark:text-neutral-400 text-sm md:text-base">
                        <span className="text-primary mt-1">✦</span>
                        <span>{highlight}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

const data = [
    {
        category: "Europe",
        title: "Paris — The City of Light",
        src: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=2073&auto=format&fit=crop",
        content: (
            <DestinationContent
                description="Paris is one of the world's most visited cities, famous for its art, cuisine, and iconic landmarks that define romance and elegance."
                highlights={[
                    "Visit the Eiffel Tower at sunset for breathtaking views",
                    "Explore the Louvre Museum — home to the Mona Lisa",
                    "Stroll along the Champs-Élysées and Seine River",
                    "Taste authentic croissants and French bistro cuisine",
                ]}
            />
        ),
    },
    {
        category: "Southeast Asia",
        title: "Bali — Island of the Gods",
        src: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=2938&auto=format&fit=crop",
        content: (
            <DestinationContent
                description="Bali offers a magical blend of lush rice terraces, spiritual temples, vibrant nightlife, and world-class surf beaches."
                highlights={[
                    "Watch the sunrise at Mount Batur volcano",
                    "Visit the sacred Tanah Lot and Uluwatu temples",
                    "Relax on the famous beaches of Seminyak and Nusa Dua",
                    "Explore the artistic village of Ubud and its markets",
                ]}
            />
        ),
    },
    {
        category: "North America",
        title: "New York City — The City That Never Sleeps",
        src: "https://images.unsplash.com/photo-1490644658840-3f2e3f8c5625?q=80&w=2070&auto=format&fit=crop",
        content: (
            <DestinationContent
                description="New York City is a global icon of culture, commerce, and diversity — from Broadway shows to world-class museums and skyline views."
                highlights={[
                    "Explore Central Park and the High Line",
                    "See Broadway shows in the Theater District",
                    "Visit the Metropolitan Museum of Art and MoMA",
                    "Experience the vibrant neighborhoods of Brooklyn and Manhattan",
                ]}
            />
        ),
    },
    {
        category: "East Asia",
        title: "Tokyo — Where Tradition Meets the Future",
        src: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=2094&auto=format&fit=crop",
        content: (
            <DestinationContent
                description="Tokyo is a city of contrasts — ancient shrines tucked between towering skyscrapers, with some of the best food in the world."
                highlights={[
                    "Experience the buzzing Shibuya Crossing at peak hours",
                    "Visit the historic Senso-ji Temple in Asakusa",
                    "Explore futuristic Akihabara and Harajuku fashion",
                    "Enjoy authentic ramen, sushi, and street food",
                ]}
            />
        ),
    },
    {
        category: "Europe",
        title: "Santorini — Aegean Paradise",
        src: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?q=80&w=2038&auto=format&fit=crop",
        content: (
            <DestinationContent
                description="Santorini's iconic white-washed buildings, blue-domed churches, and dramatic caldera views make it one of the world's most photographed destinations."
                highlights={[
                    "Watch the legendary sunset from Oia village",
                    "Cruise around the volcanic caldera",
                    "Taste local wines from the island's unique vineyards",
                    "Explore the ancient ruins of Akrotiri",
                ]}
            />
        ),
    },
    {
        category: "South Asia",
        title: "Rajasthan — The Land of Maharajas",
        src: "https://images.unsplash.com/photo-1599661046289-e31897846e41?q=80&w=2070&auto=format&fit=crop",
        content: (
            <DestinationContent
                description="Rajasthan's majestic forts, colourful bazaars, and golden deserts offer an unforgettable royal India experience."
                highlights={[
                    "Explore the magnificent Amber Fort in Jaipur",
                    "Take a camel safari in the Thar Desert near Jaisalmer",
                    "Visit the romantic Lake Palace in Udaipur",
                    "Shop for handicrafts and textiles at the local bazaars",
                ]}
            />
        ),
    },
];
