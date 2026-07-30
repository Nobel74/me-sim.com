'use client';

import Link from 'next/link';

export default function EnglishPrivacyPolicyPage() {
  return (
    <div className="container-naked max-w-4xl font-sans">
      {/* Breadcrumbs */}
      <nav className="text-xs font-semibold text-zinc-500 mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-black transition-colors">Home</Link>
        <span>/</span>
        <span className="text-black font-semibold">Privacy Policy</span>
      </nav>

      {/* Main Container */}
      <div className="bg-white rounded-3xl border border-zinc-200 p-6 sm:p-10 md:p-12 shadow-xl">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-black mb-6 tracking-tight">
          Privacy Policy
        </h1>

        <div className="wp-content font-sans text-base sm:text-lg leading-relaxed">
          <p>At <strong>ME-SIM.COM</strong> we take the protection and privacy of your personal data very seriously. This privacy policy outlines how we collect, manage, and safeguard your information when you purchase our international eSIM services.</p>
          
          <h2>1. Information We Collect</h2>
          <p>To provide our international connectivity services, we collect the following technical and contact details:</p>
          <ul>
            <li><strong>Contact Information:</strong> Name and email address for sending purchase confirmations and activation QR codes.</li>
            <li><strong>Transaction Data:</strong> Purchase history of data plans and unique ICCID identifiers for generated eSIMs.</li>
            <li><strong>Encrypted Payment Data:</strong> Secure processing via certified payment gateways (Stripe) with SSL/TLS encryption. We do not store credit card numbers.</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>Collected information is strictly used for the following operational purposes:</p>
          <ul>
            <li>Instant delivery of eSIM profiles to your email inbox and customer dashboard.</li>
            <li>Real-time mobile data usage tracking and 24/7 technical support while traveling.</li>
            <li>Compliance with legal accounting and tax billing obligations.</li>
          </ul>

          <h2>3. Security & Data Protection</h2>
          <p>We guarantee absolute confidentiality. <strong>ME-SIM.COM</strong> never sells, rents, or shares your personal data with unauthorized third parties for marketing purposes.</p>

          <h2>4. Your Privacy Rights</h2>
          <p>You may exercise your rights to access, rectify, or delete your personal data at any time by contacting our support team at <strong>info@me-sim.com</strong>.</p>
        </div>
      </div>
    </div>
  );
}
