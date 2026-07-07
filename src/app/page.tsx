import ConnectButton from '@/components/connect-button'

export default function LandingPage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-2xl text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
            Unsubscribr
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-lg mx-auto leading-relaxed">
            Connect your inbox once. We find every mailing list you are on and
            unsubscribe you in seconds. No passwords, no AI bloat.
          </p>
        </div>

        <div className="flex justify-center">
          <ConnectButton />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12 text-left">
          <div className="space-y-2">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-500">
              OAuth Only
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              We never see your password. Google &amp; Microsoft sign-in only.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-500">
              Header-First
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              The List-Unsubscribe header handles most mail with a single HTTP
              request. Fast and reliable.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-500">
              Review First
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              See every sender before we act. You choose who stays and who goes.
            </p>
          </div>
        </div>

        <p className="text-xs text-gray-400 pt-8">
          Reads message headers only. We never store your email content.
          Disconnect and delete your data at any time.
        </p>
      </div>
    </main>
  )
}
