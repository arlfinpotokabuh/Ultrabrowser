import axios from "axios";
(async () => {
    try {
        const res = await axios("https://www.google.com/search?q=Otakudesu&gbv=1");
        console.log("Status:", res.status);
    } catch(err) {
        console.log("Error status:", err.response ? err.response.status : err.message);
    }
})();
