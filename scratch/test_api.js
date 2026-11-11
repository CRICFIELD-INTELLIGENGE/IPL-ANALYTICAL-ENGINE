async function run() {
  try {
    const urls = [
      'http://localhost:5000/api/ipl/overview',
      'http://localhost:5000/api/ipl/matches',
      'http://localhost:5000/api/ipl/seasons',
    ];
    for (const url of urls) {
      console.log('Fetching:', url);
      const res = await fetch(url);
      console.log('Status:', res.status);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          console.log('Array length:', data.length);
          if (data.length > 0) console.log('First item:', data[0]);
        } else {
          console.log('Data keys:', Object.keys(data));
          console.log('Data:', data);
        }
      } else {
        console.log('Error:', await res.text());
      }
    }
  } catch (err) {
    console.error('Fetch failed:', err);
  }
}

run();
