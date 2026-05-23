const axios = require('axios');
axios.get('http://127.0.0.1:3000/api/proxy?url=https://www.youtube.com/', { responseType: 'text' })
  .then(res => console.log(res.status, res.headers, res.data.substring(0, 500)))
  .catch(err => console.error(err.message));
