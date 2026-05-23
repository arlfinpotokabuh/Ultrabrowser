import axios from 'axios';

axios.get('http://127.0.0.1:3000/api/proxy?url=https://m.youtube.com/', { responseType: 'text' })
  .then(res => console.log(res.status, res.headers['content-length'], res.data.substring(0, 200)))
  .catch(err => console.error(err.message));
