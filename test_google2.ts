import axios from 'axios';
(async () => {
    try {
        const res = await axios("https://www.google.com/httpservice/retry/enablejs?sei=neUNasylDfC8ptQPhdvkUA", {
           headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125.0.0.0 Safari/537.36" }
        });
        console.log("HTML:", res.data);
    } catch(err) {
        console.log("err:", err.response ? err.response.status : err);
    }
})();
