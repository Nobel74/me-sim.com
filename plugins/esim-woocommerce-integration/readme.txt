=== StrongEsim WooCommerce Integration ===
Contributors: fuatshakjiri
Tags: esim, woocommerce, strongesim, international, roaming
Requires at least: 6.5
Tested up to: 7.1
Stable tag: 0.3.2
Requires PHP: 7.4
WC requires at least: 8.2
WC tested up to: 11.1
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Integrate StrongEsim APIs with WooCommerce to automatically sync eSIM products, manage orders, and deliver eSIM QR codes to customers.

== Description ==

StrongEsim WooCommerce Integration is a powerful plugin that connects your WooCommerce store with the StrongEsim API platform, enabling you to sell international eSIM data plans directly from your WordPress site.

= Key Features =

* **Automatic Product Sync** - Sync eSIM products from StrongEsim API to your WooCommerce store
* **Order Management** - Automatically create eSIM orders when customers purchase from your store
* **QR Code Delivery** - Display eSIM QR codes on customer account pages for easy activation
* **Webhook Integration** - Real-time updates for order status, data usage, and eSIM status changes
* **Smart Pricing** - Built-in price calculator with customizable markup and rounding rules
* **Product Description Generator** - Automatically generate SEO-friendly product descriptions
* **Country-Specific Images** - Automatic image assignment for different countries and regions
* **Bulk Operations** - Handle product sync and management efficiently with optimized performance
* **Comprehensive Logging** - Detailed logging system for debugging and monitoring
* **Account Dashboard** - Display customer eSIM information and QR codes in WooCommerce account area

= How It Works =

1. Connect your StrongEsim API account using your credentials
2. Configure pricing rules and product settings
3. Sync eSIM products from StrongEsim to your WooCommerce store
4. When customers purchase eSIM products, orders are automatically created in StrongEsim
5. Customers receive their eSIM QR codes in their WooCommerce account dashboard
6. Webhooks keep order and eSIM status updated in real-time

= Requirements =

* WordPress 6.5 or higher
* WooCommerce 8.2 or higher (tested against WooCommerce 11.1)
* PHP 7.4 or higher (tested on PHP 8.2)
* Active StrongEsim API account
* SSL certificate (HTTPS) recommended for secure API communication

= About StrongEsim =

StrongEsim is a leading eSIM provider offering international data plans for travelers. This plugin enables WooCommerce store owners to become StrongEsim resellers and sell eSIM products directly from their websites.

== Installation ==

= Automatic Installation =

1. Log in to your WordPress admin panel
2. Navigate to Plugins > Add New
3. Search for "StrongEsim WooCommerce Integration"
4. Click "Install Now" and then "Activate"

= Manual Installation =

1. Download the plugin zip file
2. Log in to your WordPress admin panel
3. Navigate to Plugins > Add New > Upload Plugin
4. Choose the downloaded zip file and click "Install Now"
5. After installation, click "Activate Plugin"

= Configuration =

1. Navigate to Settings > StrongEsim API Settings
2. Enter your StrongEsim API credentials (email and password)
3. Configure pricing rules and markup percentages
4. Set up product description templates and image settings
5. Go to StrongEsim Dashboard to sync products
6. Start selling eSIM products!

== Frequently Asked Questions ==

= Do I need a StrongEsim account to use this plugin? =

Yes, you need an active StrongEsim API account. Contact StrongEsim to get your reseller credentials.

= Will this plugin work with any WooCommerce theme? =

Yes, the plugin is designed to work with any WooCommerce-compatible theme. The customer eSIM display uses standard WooCommerce account dashboard hooks.

= How are eSIM QR codes delivered to customers? =

After a successful purchase, eSIM QR codes are displayed in the customer's WooCommerce account dashboard. Customers can access their QR codes anytime by logging into their account.

= Can I customize product pricing? =

Yes, the plugin includes a flexible pricing calculator where you can set markup percentages and rounding rules for different price ranges.

= What happens if a webhook fails? =

The plugin includes comprehensive error logging. Failed webhooks are logged with detailed error messages, allowing you to troubleshoot and manually update orders if needed.

= Can I sync specific products or all products? =

You can sync all available eSIM products from StrongEsim or sync specific products using package codes. The dashboard provides options for both bulk and selective syncing.

= Is the plugin translation-ready? =

The plugin is designed with internationalization in mind using the text domain 'esim-woocommerce-integration'. Translation files can be added to the /languages directory.

= Does this plugin store customer payment information? =

No, all payment processing is handled by WooCommerce and your configured payment gateway. This plugin only handles eSIM product and order management.

== Screenshots ==

1. StrongEsim Dashboard - Main admin interface showing account information and sync options
2. Product Sync Interface - Bulk product synchronization with progress tracking
3. API Settings Page - Configure your StrongEsim credentials and pricing rules
4. Customer Account View - eSIM QR codes displayed in WooCommerce account dashboard
5. Order Management - eSIM order details and status tracking

== Changelog ==

= 0.3.2 =

* The connection test now diagnoses the network layer before credentials: WordPress HTTP policy (WP_HTTP_BLOCK_EXTERNAL / WP_ACCESSIBLE_HOSTS), DNS resolution, a raw TCP connect on port 443, and a control request to api.wordpress.org. The control request is what identifies whether outbound HTTPS is blocked for the whole server or only the route to StrongESIM, which decides who has to fix it
* Raised the connect timeout for StrongESIM requests. WordPress passes `timeout` to cURL but leaves the connect timeout at the Requests default of 10 seconds, which is why a blocked route always failed with "cURL error 28: Connection timed out after 10001 milliseconds" regardless of the timeout asked for. Filterable via `esim_api_connect_timeout`
* Added `esim_api_force_ipv4` for hosts whose IPv6 routing is broken, and the `ESIM_API_BASE_URL` constant for a host-level endpoint override

= 0.3.1 =

* Added a "Test API connection" button on the settings page. It reports each step separately: whether the server can reach api.strongesim.com, whether the saved credentials are accepted, whether the account's role is actually `reseller`, and whether the account can see plans. The platform answers a wrong password, an unknown email and a role mismatch with the same generic 401, so the test also probes whether the email logs in under a different role and says so
* Connection failures now show the real reason (HTTP status and the platform's message, or the transport error) instead of "check the credentials". Account lock (HTTP 429) and unverified email are named explicitly
* Matched three field names the live API returns but the reference docs spell differently: `regionCode` (as well as `region_code`) for regional plans, `dataType` (as well as `data_type`) for daily-plan detection, and the nested per-country shape of `operator_list`

= 0.3.0 =

Compatibility release for current WooCommerce (11.x) and PHP 8.x.

**WooCommerce High-Performance Order Storage (HPOS)**

* Declared HPOS, cart/checkout blocks and product block editor compatibility, so WooCommerce no longer lists the plugin as incompatible and no longer blocks HPOS
* Replaced every order read and write that used post meta with the order CRUD API. On an HPOS store none of it returned anything, which meant QR codes never appeared on the account page, the order screen always said "No QR code available", and the QR polling retried forever
* The eSIM details meta box is now registered on `add_meta_boxes` for both the classic order screen and the HPOS orders screen, and handles being handed either a `WP_Post` or a `WC_Order`
* Webhook order lookup no longer queries `wp_postmeta` directly

**Order fulfilment**

* Every order to the platform now carries a stable `Idempotency-Key`, and a line item that already has an eSIM is never ordered again. A repeated status transition used to provision a second eSIM and debit the reseller wallet twice
* Daily ("Unlimited") plans are ordered with `periodNum` set from the plan's validity, instead of silently defaulting to one day
* eSIMs are provisioned when an order reaches *processing* as well as *completed*, and synced products are marked virtual and downloadable so WooCommerce auto-completes them. Previously a paid order could sit in processing and never deliver anything
* A paid order whose provisioning failed is flagged, noted on the order and shown in the meta box instead of failing silently

**Webhooks**

* Read the `event` field the platform actually sends (the old code read `event_type`, so every webhook fell through to "unknown event" and nothing was ever updated)
* Corrected the data field names: `remaining_data_mb`, `expiry_date`, `remaining_days`; usage percentage is derived when not supplied
* A webhook can complete a paid order, but can no longer cancel, refund or fail one. Mapping the platform's "cancelled" onto WooCommerce used to cancel a paid order and re-trigger the cancellation hook

**Product sync**

* Plans are fetched page by page instead of one request for the whole catalogue, which is what previously exhausted memory and killed the sync
* Regional plans (no `country_code`, only `region_code`) are handled instead of passing null into `explode()`
* Unlimited plans display "Unlimited" rather than the daily fair-use allowance formatted as a total
* Outdated products are only deleted when the whole catalogue was fetched successfully, so a failed API call can no longer empty the shop
* Fatal errors during a sync are caught (`Throwable`, not just `Exception`), and PHP notices can no longer corrupt the AJAX response, which is what produced the unexplained "connection error"
* `wp_cache_flush()` per batch replaced with targeted cache clearing; it was wiping the object cache for the entire site
* Media library image matching builds its filename index once per request instead of scanning every attachment for every product

**API client**

* Re-authenticates and retries once on 401/403, so a short-lived reseller token expiring mid-sync no longer breaks everything until the cached token expires
* Login failures no longer log a response body that can contain the submitted password

**Security and hygiene**

* Logging moved to the WooCommerce logger (WooCommerce > Status > Logs, source "strongesim"). The old `wp-content/esim-plugin.log` was readable over HTTP by anyone and contained ICCIDs and QR code URLs
* The stored API password is no longer printed into the settings page HTML; leaving the field blank keeps the saved value
* Capability checks and working nonces on every admin page, admin-post action and AJAX endpoint. The "Send SMS" button checked a nonce it never sent, so it always failed
* SMS now goes through the platform's `POST /profiles/:iccid/sms` endpoint. The previous implementation called a provider endpoint using signing properties that did not exist on the class

**PHP 8**

* Fixed the fatal `esc_html()` call on the data-usage array in the order meta box
* Fixed undefined array key warnings on every product description (`unusedValidTime`, `locationNetworkList`)
* Replaced `str_contains()`, which is PHP 8.0+, in a plugin that declares PHP 7.4
* The plugin now boots on `plugins_loaded` and shows a notice if WooCommerce is inactive, instead of hooking fulfilment to `woocommerce_loaded` (which never fires if this plugin loads after WooCommerce) and fatalling without WooCommerce

= 0.2.1 =
* Added comprehensive WordPress.org submission requirements
* Updated plugin header with complete metadata
* Improved documentation and readme file
* Added GPL v2 license compatibility

= 0.2.0 =
* Enhanced product sync with resume capability
* Added bulk product deletion functionality
* Improved memory and execution time handling for large catalogs
* Added automatic image upload settings
* Enhanced webhook security with HMAC signature verification
* Improved error logging and debugging capabilities

= 0.1.0 =
* Initial release
* Basic product sync functionality
* Order creation and management
* QR code delivery system
* Webhook integration for real-time updates
* Price calculator with markup rules
* Product description generator
* Admin dashboard interface

== Upgrade Notice ==

= 0.3.2 =
Diagnoses network-level connection failures (blocked outbound HTTPS, firewall drops) instead of reporting them as credential problems.

= 0.3.1 =
Adds a connection test to the settings page and reports the real reason an API login failed.

= 0.3.0 =
Required for WooCommerce 8.2+ with High-Performance Order Storage, and for PHP 8. Fixes order provisioning, webhooks and product sync. After upgrading: run a product sync once (it backfills the plan metadata existing products are missing) and re-register the webhook on the settings page.

= 0.2.1 =
This version adds WordPress.org submission requirements and improves documentation. Safe to upgrade.

= 0.2.0 =
Major improvements to product sync performance and bulk operations. Recommended upgrade for better stability.

== Developer Notes ==

= API Integration =

This plugin communicates with the StrongEsim API at https://api.strongesim.com/api/v1/. The following data is transmitted:
* API credentials (email/password) for authentication
* Order information when customers complete purchases
* Product sync requests to retrieve available eSIM plans
* Webhook registration and management

= Hooks and Filters =

The plugin provides several WordPress hooks for developers:

**Actions:**
* `esim_query_qr_code` - Scheduled event for QR code queries
* Custom AJAX actions for product sync and management

**REST API Endpoints:**
* `/wp-json/esim/v1/webhook` - Webhook endpoint for StrongEsim callbacks

= Privacy Policy =

This plugin connects to the StrongEsim API to provide eSIM product and order management functionality. The following information is shared with StrongEsim:
* Reseller account credentials (configured in settings)
* Customer order information (when purchases are made)
* Product synchronization requests

No customer data is shared with third parties beyond what is necessary for eSIM order fulfillment through StrongEsim.

== Support ==

For support inquiries, please contact the plugin author or visit the StrongEsim website for API-related questions.

== Credits ==

Developed by Fuat Shakjiri
Plugin integrates with StrongEsim API services
