'use client';

import Link from 'next/link';

export default function EnglishRefundPolicyPage() {
  return (
    <div className="container-naked max-w-4xl font-sans">
      {/* Breadcrumbs */}
      <nav className="text-xs font-semibold text-zinc-500 mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-black transition-colors">Home</Link>
        <span>/</span>
        <span className="text-black font-semibold">Refund Policy</span>
      </nav>

      {/* Main Container */}
      <div className="bg-white rounded-3xl border border-zinc-200 p-6 sm:p-10 md:p-12 shadow-xl">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-black mb-6 tracking-tight">
          Refund Policy
        </h1>

        <div className="wp-content font-sans text-base sm:text-lg leading-relaxed">
          <p>At <strong>ME-SIM.COM</strong> we are committed to customer satisfaction and high-quality international mobile connectivity. This policy outlines conditions and procedures for requesting a return or refund for your purchase.</p>
          
          <h2>1. Connection Guarantee & Eligible Refund Cases</h2>
          <p>A 100% refund of the eSIM purchase price will be granted under the following verifiable conditions:</p>
          <ul>
            <li><strong>Network technical failure:</strong> If the eSIM cannot connect or activate mobile data in destination due to provider network errors or QR profile generation issues.</li>
            <li><strong>Unresolved support case:</strong> When our 24/7 technical team is unable to restore your data connectivity after following guided troubleshooting steps.</li>
            <li><strong>Accidental duplicate order:</strong> If a duplicate order was placed by mistake prior to scanning or installing the profile.</li>
          </ul>

          <h2>2. Non-Refundable Circumstances</h2>
          <p>Refunds will not be issued under the following circumstances:</p>
          <ul>
            <li><strong>Incompatible or carrier-locked device:</strong> If the user's phone does not support eSIM technology or is carrier-locked by their home network operator. Users must check device compatibility before buying.</li>
            <li><strong>Active data usage started:</strong> Once the eSIM has successfully connected to the destination network and data usage has commenced.</li>
            <li><strong>Incorrect user contact details:</strong> If an incorrect email address was entered during checkout (though support will assist in resending the QR code to your correct email).</li>
          </ul>

          <h2>3. How to Request a Refund</h2>
          <p>To request a refund, please send an email to <strong>info@me-sim.com</strong> including:</p>
          <ul>
            <li>Your order number or eSIM ICCID code.</li>
            <li>A screenshot of your device's cellular settings page.</li>
            <li>A brief description of the technical connection issue.</li>
          </ul>
          <p>Refund requests are reviewed and processed within 24 to 48 business hours. Approved refunds will be credited back via the original payment method.</p>
        </div>
      </div>
    </div>
  );
}
