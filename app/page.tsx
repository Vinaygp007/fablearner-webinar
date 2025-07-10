import Link from "next/link";

export default function Home() {
  return (
    <section className="w-full min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary via-info to-secondary py-12 px-4">
      <div className="bg-white/95 rounded-2xl shadow-card p-10 max-w-2xl w-full text-center flex flex-col items-center">
        <h1 className="text-4xl sm:text-5xl font-display font-bold text-primary mb-4 leading-tight">
          Your Child Can Start Reading <br />
          <span className="text-accent">Before Age 3!</span>
        </h1>
        <p className="text-lg sm:text-xl text-secondary mb-6">
          Join the World&apos;s Highest-Rated Online Masterclass for Parents.<br />
          Learn simple, science-backed techniques to teach your child to read — in just 15 minutes a day.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 mb-8 w-full justify-center">
          <div className="bg-info text-white rounded-lg py-4 px-6 font-bold text-base shadow-button">90% Success Rate</div>
          <div className="bg-accent text-primary rounded-lg py-4 px-6 font-bold text-base shadow-button">15 min Daily Practice</div>
          <div className="bg-secondary text-white rounded-lg py-4 px-6 font-bold text-base shadow-button">10x Faster Learning</div>
        </div>
        <Link href="/webinar">
          <button className="text-xl bg-primary text-white rounded-2xl py-4 px-10 border-none font-bold shadow-button transition-colors hover:bg-info">
            Watch Webinar Now
          </button>
        </Link>
      </div>
      {/* Dashboard Section */}
      <div className="mt-10 max-w-2xl w-full flex flex-col items-center">
        <div className="w-full bg-white/90 rounded-xl shadow-card p-8 flex flex-col items-center">
          <h2 className="text-2xl font-display font-bold text-secondary mb-4">Dashboard</h2>
          <ul className="w-full text-left text-lg text-gray-700 space-y-2">
            <li><span className="font-bold text-primary">✔</span> Access the full prerecorded webinar</li>
            <li><span className="font-bold text-primary">✔</span> Join the live chat and ask questions</li>
            <li><span className="font-bold text-primary">✔</span> Download helpful resources</li>
            <li><span className="font-bold text-primary">✔</span> Track your child’s reading progress</li>
          </ul>
          <Link href="/webinar">
            <button className="mt-6 text-lg bg-secondary text-white rounded-xl py-3 px-8 font-bold shadow-button transition-colors hover:bg-primary">
              Go to Dashboard
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}
