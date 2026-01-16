/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure proper output for Netlify
  output: 'standalone',
  // Disable image optimization if not using Next.js Image component
  images: {
    unoptimized: true
  }
};

export default nextConfig;
