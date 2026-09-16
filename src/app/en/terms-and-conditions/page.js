'use client';

import Link from 'next/link';

export default function EnglishTermsAndConditionsPage() {
  return (
    <div className="container-naked max-w-4xl font-sans pb-16">
      {/* Breadcrumbs */}
      <nav className="text-xs font-semibold text-zinc-500 mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-black transition-colors">Home</Link>
        <span>/</span>
        <span className="text-black font-semibold">Terms & Conditions</span>
      </nav>

      {/* Main Container */}
      <div className="bg-white rounded-3xl border border-zinc-200 p-6 sm:p-10 md:p-12 shadow-xl">
        <div className="border-b border-zinc-100 pb-6 mb-8">
          <span className="bg-[#ffec00] text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-3 inline-block">
            Legal
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-black tracking-tight mb-2">
            Terms & Conditions
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500">
            Last updated: July 11, 2026 · ME-SIM.COM
          </p>
        </div>

        <div className="space-y-8 text-zinc-700 text-[1.125rem] leading-relaxed legal-content">
          {/* 1. Who we are */}
          <section>
            <h2 className="text-lg sm:text-xl font-bold text-black mb-3">
              1. Who we are
            </h2>
            <p>
              These terms govern your use of the <strong>ME-SIM.COM</strong> website and the purchase of our digital eSIM data plans. The service is operated by <strong>ME-SIM.COM</strong> (referred to as “ME-SIM.COM”, “we”, “us”). By creating an account or completing a purchase you accept these terms.
            </p>
          </section>

          {/* 2. What we sell */}
          <section>
            <h2 className="text-lg sm:text-xl font-bold text-black mb-3">
              2. What we sell
            </h2>
            <p>
              <strong>ME-SIM.COM</strong> sells prepaid, data-only travel eSIMs for use in the countries and regions listed on each plan. Our eSIMs provide mobile data only: they do not include a phone number, voice calls, or SMS. Coverage, speed, and network availability depend on local partner carriers at your destination and are not guaranteed at every location or at all times.
            </p>
          </section>

          {/* 3. Device compatibility */}
          <section>
            <h2 className="text-lg sm:text-xl font-bold text-black mb-3">
              3. Device compatibility
            </h2>
            <p>
              eSIMs only work on eSIM-compatible, carrier-unlocked devices. It is your responsibility to confirm your device is compatible and unlocked before purchasing. A plan that cannot be used because a device is locked or incompatible is not a defect of the service.
            </p>
          </section>

          {/* 4. Accounts */}
          <section>
            <h2 className="text-lg sm:text-xl font-bold text-black mb-3">
              4. Accounts
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>You must provide a valid email address; your eSIM is delivered to your account and email.</li>
              <li>Keep your password confidential. Activity under your account is your responsibility.</li>
              <li>You must be at least 18 years old (or the age of majority where you live) to purchase.</li>
              <li>We may suspend accounts involved in fraud, abuse, or violation of these terms.</li>
            </ul>
          </section>

          {/* 5. Orders, prices, and payment */}
          <section>
            <h2 className="text-lg sm:text-xl font-bold text-black mb-3">
              5. Orders, prices, and payment
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>All prices are shown before purchase. EUR, USD, GBP, and AUD prices are converted at our posted flat rates and rounded, so the amount you see at checkout is the amount you pay.</li>
              <li>Payments are processed securely via <strong>Stripe</strong>. On our website, Stripe handles major debit and credit cards (Visa, Mastercard, American Express). We do not require any app installation to purchase or manage eSIMs, as everything is handled directly through your secure web client area. We never store your payment card details.</li>
              <li>An order is complete when payment is captured and the eSIM is issued to your account.</li>
              <li>Promotional codes apply only at the moment of purchase and cannot be applied retroactively.</li>
            </ul>
          </section>

          {/* 6. Delivery, activation, and validity */}
          <section>
            <h2 className="text-lg sm:text-xl font-bold text-black mb-3">
              6. Delivery, activation, and validity
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Delivery is digital and immediate: your QR code and manual installation details appear in your web account (and by email) right after purchase.</li>
              <li>You have up to 180 days after purchase to install the eSIM; after scanning, activation typically must start within 30 days.</li>
              <li>The validity period starts when the eSIM first connects to a supported network at the destination, not at the moment of payment, unless the plan states otherwise.</li>
              <li>Unused data expires when the plan validity ends. Validity periods are not paused or extended.</li>
            </ul>
          </section>

          {/* 7. Top-ups */}
          <section>
            <h2 className="text-lg sm:text-xl font-bold text-black mb-3">
              7. Top-ups
            </h2>
            <p>
              Where available, top-ups add data or days to an existing eSIM. Top-ups attach to the same eSIM profile and follow the same rules as the original plan, managed directly through your web account without requiring any external app.
            </p>
          </section>

          {/* 8. Acceptable use */}
          <section>
            <h2 className="text-lg sm:text-xl font-bold text-black mb-3">
              8. Acceptable use
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Our plans are for personal, fair use while traveling. Commercial resale of individual retail plans is not permitted (resellers should use our official reseller program).</li>
              <li>You may not use the service for unlawful activity, spam, network abuse, or to interfere with the service or other users.</li>
              <li>Local partner networks may apply their own fair-use policies (FUP), including speed management at very high usage.</li>
            </ul>
          </section>

          {/* 9. Refunds */}
          <section>
            <h2 className="text-lg sm:text-xl font-bold text-black mb-3">
              9. Refunds
            </h2>
            <p>
              Refunds are handled under our{' '}
              <Link href="/en/refund-policy" className="text-black font-bold underline hover:text-amber-600 transition-colors">
                Refund Policy
              </Link>
              . In short: if your eSIM genuinely cannot connect due to technical errors on our network and our support team cannot fix it, you get your money back.
            </p>
          </section>

          {/* 10. Affiliates and resellers */}
          <section>
            <h2 className="text-lg sm:text-xl font-bold text-black mb-3">
              10. Affiliates and resellers
            </h2>
            <p>
              Participation in our affiliate or reseller programs is subject to the program terms presented at signup. Commissions accrue only on genuine, non-fraudulent purchases and may be reversed when the underlying payment is refunded or charged back.
            </p>
          </section>

          {/* 11. Liability */}
          <section>
            <h2 className="text-lg sm:text-xl font-bold text-black mb-3">
              11. Liability
            </h2>
            <p>
              To the maximum extent permitted by law, our total liability for any claim arising from a purchase is limited to the amount you paid for that purchase. We are not liable for indirect or consequential losses, or for outages, coverage gaps, or speed limitations of local partner networks. Nothing in these terms limits liability that cannot be limited by law, and nothing affects mandatory consumer rights in your country of residence.
            </p>
          </section>

          {/* 12. Changes and governing law */}
          <section>
            <h2 className="text-lg sm:text-xl font-bold text-black mb-3">
              12. Changes and governing law
            </h2>
            <p>
              We may update these terms; the version published on this page at the time of your purchase applies to that purchase.
            </p>
          </section>

          {/* 13. Contact */}
          <section className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5">
            <h2 className="text-lg sm:text-xl font-bold text-black mb-2">
              13. Contact
            </h2>
            <p className="text-zinc-600">
              <strong>ME-SIM.COM</strong>
              <br />
              Email:{' '}
              <a href="mailto:info@me-sim.com" className="text-black font-bold underline hover:text-amber-600">
                info@me-sim.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
