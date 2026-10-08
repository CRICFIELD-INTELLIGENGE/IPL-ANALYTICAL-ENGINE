async function run() {
  try {
    const url = 'http://localhost:5000/api/ipl/overview';
    console.log('Fetching overview format:', url);
    const res = await fetch(url);
    console.log('Status:', res.status);
    if (!res.ok) {
      console.log('Error:', await res.text());
      return;
    }
    const data = await res.json();
    console.log('Keys in returned object:', Object.keys(data));
    console.log('Values:', data);
  } catch (err) {
    console.error('Fetch failed:', err);
  }
}

run();
