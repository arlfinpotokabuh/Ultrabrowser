import axios from "axios";
import fs from "fs";

(async () => {
    try {
        const res = await axios("http://localhost:3000/api/proxy?url=https://www.google.com/search?q=Otakudesu&gbv=1");
        fs.writeFileSync("google_output.html", res.data);
        console.log("Written to google_output.html");
    } catch(err) {
        console.log("Error status:", err.response ? err.response.status : err.message);
    }
})();
