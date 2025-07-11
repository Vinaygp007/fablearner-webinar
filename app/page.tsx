import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <section className="w-full min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-pink-500 via-pink-600 to-pink-700 py-12 px-4">
      {/* Logo */}
      <Image
        src="https://www.fablearner.com/logo.png"
        alt="FabLearner Logo"
        width={180}
        height={80}
        className="mb-8 drop-shadow-lg"
        priority
      />
      {/* Hero */}
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-10 max-w-2xl w-full text-center flex flex-col items-center">
        <h1 className="text-4xl sm:text-5xl font-dingdong font-bold text-pink-600/50 mb-4 leading-tight">
          Unlock Your Child's{" "}
          <span className="text-yellow-400">Reading Superpower</span>
        </h1>
        <p className="text-lg sm:text-xl text-pink-700 mb-6 font-andika">
          Join the World&apos;s Highest-Rated Online Masterclass for Parents.
          <br />
          Science-backed, playful techniques to help your child read{" "}
          <span className="font-bold text-pink-600">before age 3</span> — in
          just 15 minutes a day!
        </p>
        <div className="flex flex-col sm:flex-row gap-4 mb-8 w-full justify-center">
          <div className="bg-pink-600/90 text-white rounded-lg py-4 px-6 font-bold text-base shadow-lg font-andika">
            90% Success Rate
          </div>
          <div className="bg-yellow-400 text-pink-600 rounded-lg py-4 px-6 font-bold text-base shadow-lg font-andika">
            15 min Daily Practice
          </div>
          <div className="bg-pink-600/90 text-white rounded-lg py-4 px-6 font-bold text-base shadow-lg font-andika">
            10x Faster Learning
          </div>
        </div>
        <Link href="/webinar">
          <button className="text-xl bg-pink-600/90 text-white rounded-2xl py-4 px-10 border-none font-bold shadow-lg transition-colors hover:bg-pink-800 font-dingdong">
            Watch Webinar Now
          </button>
        </Link>
      </div>
      {/* Dashboard Preview */}
      <div className="mt-10 max-w-2xl w-full flex flex-col items-center">
        <div className="w-full bg-white/90 backdrop-blur-sm rounded-xl shadow-2xl p-8 flex flex-col items-center">
          <h2 className="text-2xl font-dingdong font-bold text-pink-700 mb-4 flex items-center gap-2">
            <span className="inline-block w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
            Dashboard Preview
          </h2>
          <ul className="w-full text-left text-lg text-gray-700 space-y-2 mb-6 font-andika">
            <li>
              🎥 Access the{" "}
              <span className="font-bold text-pink-600">Webinar Replay</span>{" "}
              anytime
            </li>
            <li>
              💬 Experience{" "}
              <span className="font-bold text-pink-600">Live Chat</span> as if
              you were there
            </li>
            <li>
              📥 Download exclusive{" "}
              <span className="font-bold text-yellow-400">resources</span>
            </li>
            <li>
              📈 Track your child's{" "}
              <span className="font-bold text-pink-700">reading progress</span>
            </li>
          </ul>
          <Link href="/webinar">
            <button className="mt-2 text-lg bg-pink-700 text-white rounded-xl py-3 px-8 font-bold shadow-lg transition-colors hover:bg-pink-600 font-andika">
              Go to Dashboard
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}
