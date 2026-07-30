'use client';

import Link from 'next/link';

export default function EnglishTermsAndConditionsPage() {
  return (
    <div className="container-naked max-w-4xl font-sans">
      {/* Breadcrumbs */}
      <nav className="text-xs font-semibold text-zinc-500 mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-black transition-colors">Home</Link>
        <span>/</span>
        <span className="text-black font-semibold">Terms & Conditions</span>
      </nav>

      {/* Main Container */}
      <div className="bg-white rounded-3xl border border-zinc-200 p-6 sm:p-10 md:p-12 shadow-xl">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-black mb-6 tracking-tight">
          Terms & Conditions
        </h1>

        <div className="wp-content font-sans text-base sm:text-lg leading-relaxed">
          <p>Welcome to <strong>ME-SIM.COM</strong>. By purchasing and activating our prepaid international eSIM profiles, you agree to these service terms and conditions.</p>
          
          <h2>1. Service Description</h2>
          <p><strong>ME-SIM.COM</strong> provides prepaid international mobile data connectivity via data-only eSIM profiles. Services do not include a phone number for traditional voice calls or SMS messages, except for VoIP apps over mobile data (e.g., WhatsApp, Telegram, Skype).</p>

          <h2>2. Device Compatibility & Activation</h2>
          <p>Customers are responsible for verifying that their mobile phone or tablet is eSIM compatible and carrier-unlocked prior to purchasing.</p>
          <ul>
            <li>eSIM profiles are single-use installation profiles and cannot be transferred between devices once scanned.</li>
            <li>The validity period begins upon first connecting to a supported mobile carrier network in the destination country.</li>
          </ul>

          <h2>3. Cancellation & Refund Policy</h2>
          <p>We guarantee quality connectivity. If an eSIM fails to connect due to technical errors on our provider network and our 24/7 support cannot resolve it, a full refund will be granted.</p>
          <ul>
            <li>Refunds are not granted if the user's device is incompatible with eSIM technology or carrier-locked by their home operator.</li>
            <li>No refunds apply once data consumption has successfully started in destination.</li>
          </ul>

          <h2>4. Acceptable Use Policy</h2>
          <p>Users agree to use data services strictly for lawful purposes and refrain from fraudulent network usage or unauthorized traffic routing.</p>
        </div>
      </div>
    </div>
  );
}
