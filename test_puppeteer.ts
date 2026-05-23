import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

(async () => {
    try {
        const browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"]
        });
        const page = await browser.newPage();
        const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
        await page.setUserAgent(userAgent);
        const res = await page.goto("https://www.google.com/search?q=Otakudesu&gbv=1", { waitUntil: "domcontentloaded", timeout: 35000 });
        console.log("Status pupp:", res ? res.status() : "none");
        await new Promise(r => setTimeout(r, 4000));
        const html = await page.content();
        console.log("Len:", html.length, "Title:", await page.title());
        await browser.close();
    } catch(err) {
        console.log(err.message);
    }
})();
