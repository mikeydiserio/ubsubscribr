import Link from 'next/link'

// PayPal accepts a receiver email as the `business` param on its donate URL.
const DONATE_URL =
  'https://www.paypal.com/donate/?business=michael.diserio@gmail.com&currency_code=USD&item_name=Support+Unsubscribr'

interface DonateLinkProps {
  label?: string
  className?: string
}

export default function DonateLink({
  label = 'Donate',
  className = '',
}: DonateLinkProps) {
  return (
    <Link
      href={DONATE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-pink-500 dark:hover:text-pink-400 transition-colors ${className}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="size-4"
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
      {label}
    </Link>
  )
}
