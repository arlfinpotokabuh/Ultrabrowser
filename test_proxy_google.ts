import axios from "axios";
(async () => {
    try {
        const res = await axios("http://localhost:3000/api/proxy?url=https://www.google.com/search?q=Otakudesu&gbv=1");
        console.log("Headers:", res.headers);
    } catch(err) {
        console.log("Error status:", err.response ? err.response.status : err.message);
    }
})();
