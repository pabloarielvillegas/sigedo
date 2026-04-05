import pg from 'pg';

const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://sigedo:BM55LnhEck7j67zm@100.125.151.114:5432/sigedo',
  ssl: false // Try without SSL first, as it's a direct IP
});

async function test() {
  try {
    console.log('Connecting...');
    await client.connect();
    console.log('Connected successfully!');
    const res = await client.query('SELECT NOW()');
    console.log('Query result:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('Connection error:', err);
    process.exit(1);
  }
}

test();
