const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=');
    if (idx > -1) {
      const key = trimmed.substring(0, idx).trim();
      let val = trimmed.substring(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
});

async function main() {
  const wcUrl = env.WOOCOMMERCE_API_URL || 'https://api.me-sim.com';
  const ck = env.WOOCOMMERCE_CONSUMER_KEY || env.WC_CONSUMER_KEY;
  const cs = env.WOOCOMMERCE_CONSUMER_SECRET || env.WC_CONSUMER_SECRET;
  const authHeader = 'Basic ' + Buffer.from(`${ck}:${cs}`).toString('base64');

  const secondIccid = '8910300000063677656';
  const secondLpa = 'LPA:1$rsp-eu.simlessly.com$0c2b6345-16c9-4831-a3d2-7461d685fc4e';
  const secondQr = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(secondLpa)}`;

  console.log(`Updating WooCommerce Order #77 with real second Spain 500MB ICCID (${secondIccid})...`);
  const updateRes = await fetch(`${wcUrl}/wp-json/wc/v3/orders/77`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify({
      status: 'completed',
      meta_data: [
        { key: '_esim_iccid', value: secondIccid },
        { key: '_esim_transaction_no', value: secondIccid },
        { key: '_esim_activation_code', value: secondLpa },
        { key: '_esim_qr_code', value: secondQr },
        { key: '_esim_data_amount', value: '500 MB / Día' },
        { key: '_esim_days', value: '1' },
        { key: '_esim_country', value: 'España' },
        { key: '_esim_iso', value: 'es' },
      ],
    }),
  });

  console.log('Update Status:', updateRes.status);
  if (updateRes.ok) {
    const updatedOrder = await updateRes.json();
    console.log('WooCommerce Order #77 updated successfully!');
    console.log('New status:', updatedOrder.status);
    console.log('New meta:', updatedOrder.meta_data.filter(m => m.key.startsWith('_esim')));
  } else {
    console.log('Update Error:', await updateRes.text());
  }
}

main().catch(console.error);
