const ck = 'ck_ebbe1fdf83a8fa6be4659946bc71a9b1a227854b';
const cs = 'cs_b5b62eb3636ce242e1ab7e8db77365660ef5e190';
const wcUrl = 'https://api.me-sim.com';
const email = 'paxfer@hotmail.com';

async function run() {
  const auth = 'Basic ' + Buffer.from(`${ck}:${cs}`).toString('base64');
  
  console.log('1. Testing Customer Query for:', email);
  try {
    const res = await fetch(`${wcUrl}/wp-json/wc/v3/customers?email=${encodeURIComponent(email)}`, {
      headers: { Authorization: auth }
    });
    console.log('Customer response status:', res.status);
    const data = await res.json();
    console.log('Customer data:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Customer query failed:', err);
  }

  console.log('\n2. Testing General Orders Query');
  try {
    const res = await fetch(`${wcUrl}/wp-json/wc/v3/orders?per_page=10`, {
      headers: { Authorization: auth }
    });
    console.log('Orders response status:', res.status);
    const data = await res.json();
    console.log('Orders found:', data.length);
    if (data.length > 0) {
      console.log('First order details:', {
        id: data[0].id,
        billing_email: data[0].billing?.email,
        total: data[0].total,
        meta_data_keys: data[0].meta_data?.map(m => m.key)
      });
    }
  } catch (err) {
    console.error('Orders query failed:', err);
  }
}

run();
