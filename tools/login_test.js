(async ()=>{
  const http = require('http');
  const data = JSON.stringify({ identifier: 'ENDO01', password: '123456' });
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login/doctorlogin',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
  };

  const req = http.request(options, (res) => {
    let s = '';
    res.on('data', (c) => s += c);
    res.on('end', () => {
      console.log('STATUS', res.statusCode);
      try { console.log(JSON.parse(s)); } catch(e) { console.log(s); }
    });
  });

  req.on('error', (e) => console.error('ERROR', e));
  req.write(data);
  req.end();
})();
