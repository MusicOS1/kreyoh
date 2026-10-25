import type { NextConfig } from 'next';
const config: NextConfig = {
  // Keep the local owner preview free of the floating development badge over mobile navigation.
  devIndicators: false,
};
export default config;
