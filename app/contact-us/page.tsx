import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Contact the Trip Planner team for support and product feedback.",
};

export default function ContactUsPage() {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 md:px-10">
      <div className="rounded-3xl border bg-white p-8 shadow-sm md:p-12">
        <p className="mb-2 text-sm font-medium text-primary">Trip Planner</p>
        <h1 className="text-4xl font-bold tracking-tight">Contact Us</h1>
        <p className="mt-4 text-lg text-gray-600">
          Have a question, found an issue, or have an idea for Trip Planner? We would love to hear from you.
        </p>

        {supportEmail ? (
          <a
            href={`mailto:${supportEmail}`}
            className="mt-8 inline-flex rounded-xl bg-primary px-5 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Email the Trip Planner team
          </a>
        ) : (
          <div className="mt-8 rounded-2xl border bg-gray-50 p-5 text-sm text-gray-600">
            Support email is not configured yet. Set <code>NEXT_PUBLIC_SUPPORT_EMAIL</code> in your environment to enable the contact button.
          </div>
        )}
      </div>
    </main>
  );
}
