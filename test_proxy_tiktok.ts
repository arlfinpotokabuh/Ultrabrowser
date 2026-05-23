import axios from 'axios';
axios.get('http://127.0.0.1:3000/api/proxy?url=https://www.tiktok.com/', { responseType: 'text' })
  .then(res => console.log(res.status, res.data.substring(0, 500)))
  .catch(err => console.error(err.message));
