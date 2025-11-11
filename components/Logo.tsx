/**
 * Logo Component
 * Displays the application logo with transparent background support
 */

import Image from 'next/image'
import Link from 'next/link'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

const sizeMap = {
  sm: { width: 24, height: 24 },
  md: { width: 32, height: 32 },
  lg: { width: 48, height: 48 },
}

export default function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const dimensions = sizeMap[size]

  return (
    <Link href="/" className={`flex items-center ${className}`}>
      <Image
        src="/logo.png"
        alt="Chatbot Companion Logo"
        width={dimensions.width}
        height={dimensions.height}
        className="object-contain"
        priority
        style={{ backgroundColor: 'transparent' }}
      />
      {showText && (
        <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">
          Chatbot Companion
        </span>
      )}
    </Link>
  )
}











