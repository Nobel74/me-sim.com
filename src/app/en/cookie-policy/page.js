'use client';

import Link from 'next/link';

export default function CookiePolicyPage() {
  return (
    <div className="container-naked max-w-4xl font-sans">
      {/* Breadcrumbs */}
      <nav className="text-xs font-semibold text-zinc-500 mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-black transition-colors">Home</Link>
        <span>/</span>
        <span className="text-black font-semibold">Cookie Policy</span>
      </nav>

      {/* Main Container */}
      <div className="bg-white rounded-3xl border border-zinc-200 p-6 sm:p-10 md:p-12 shadow-xl">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-black mb-6 tracking-tight">
          Cookie Policy
        </h1>

        <div className="wp-content font-sans text-base sm:text-lg leading-relaxed">
          <p>At <strong>ME-SIM.COM</strong> we are committed to transparency and compliance with data protection laws (including the European GDPR). Below we inform you about the use of cookies on our platform.</p>
          
          <h2>1. What are Cookies?</h2>
          <p>Cookies are small text files that websites you visit store on your device (computer, smartphone, tablet). They are used to make the website work properly, improve security, and offer a better user experience.</p>
          
          <h2>2. Types of Cookies Used on Our Website</h2>
          <ul>
            <li><strong>Technical or Obligatory Cookies:</strong> Essential for the website to function (shopping cart, selected language, consent preferences). They cannot be disabled.</li>
            <li><strong>Analytics Cookies (Google Analytics):</strong> Help us measure website performance and optimize the browsing experience anonymously.</li>
            <li><strong>Marketing & Advertising Cookies (Google Tag Manager):</strong> Allow us to measure the effectiveness of our campaigns and deliver relevant ads.</li>
          </ul>

          <h2>3. Detailed List of Cookies Used</h2>
          <table>
            <thead>
              <tr>
                <th>Provider / Cookie</th>
                <th>Technical Name / Storage</th>
                <th>Duration</th>
                <th>Purpose</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>ME-SIM.COM</strong></td>
                <td><code>mesim_lang</code> / <code>localStorage</code></td>
                <td>Persistent</td>
                <td>Saves the user's preferred interface language (ES/EN).</td>
              </tr>
              <tr>
                <td><strong>ME-SIM.COM</strong></td>
                <td><code>mesim_curr</code> / <code>localStorage</code></td>
                <td>Persistent</td>
                <td>Stores the user's preferred currency (EUR, USD, etc.).</td>
              </tr>
              <tr>
                <td><strong>ME-SIM.COM</strong></td>
                <td><code>mesim_cart</code> / <code>localStorage</code></td>
                <td>Persistent</td>
                <td>Retains user's shopping cart items.</td>
              </tr>
              <tr>
                <td><strong>ME-SIM.COM</strong></td>
                <td><code>mesim_cookie_consent</code> / <code>localStorage</code></td>
                <td>1 Year</td>
                <td>Records the user's cookie consent choices.</td>
              </tr>
              <tr>
                <td><strong>Google Analytics</strong></td>
                <td><code>_ga</code>, <code>_ga_*</code></td>
                <td>Up to 2 years</td>
                <td>Analyzes traffic and site usage statistics.</td>
              </tr>
              <tr>
                <td><strong>Google Tag Manager</strong></td>
                <td>Dynamic Script tags</td>
                <td>Session</td>
                <td>Dynamically injects conversion tags and marketing scripts.</td>
              </tr>
            </tbody>
          </table>

          <h2>4. How can you manage or revoke your preferences?</h2>
          <p>You can change your cookie settings at any time from the interactive banner in the footer of the website, or by adjusting your privacy settings directly in your browser.</p>
        </div>
      </div>
    </div>
  );
}
