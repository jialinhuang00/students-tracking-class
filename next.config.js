/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/',
        destination: '/today',
        permanent: false,
      },
    ]
  },
}

module.exports = nextConfig