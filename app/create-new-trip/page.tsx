import React from "react";
import ChatBox from "./_components/ChatBox";
import Itinerary from "./_components/Itinerary";

function CreateNewTrip() {
    return (
        <main className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-background via-background to-primary/5">
            <div className="mx-auto grid w-full max-w-[1500px] grid-cols-1 gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[410px_minmax(0,1fr)] lg:px-8">
                <aside className="min-w-0 lg:sticky lg:top-5 lg:h-[calc(100vh-84px)]">
                    <ChatBox />
                </aside>

                <section className="min-w-0 overflow-hidden rounded-3xl border bg-card/80 shadow-sm backdrop-blur-sm">
                    <Itinerary />
                </section>
            </div>
        </main>
    );
}

export default CreateNewTrip;
