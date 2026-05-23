const axios = require('axios');
const cheerio = require('cheerio');
axios.get('https://www.startpage.com/do/dsearch?query=Otakudesu', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
}).then(res => {
    const $ = cheerio.load(res.data);
    const links = [];
    $('a').each((i, el) => {
        links.push({
           class: $(el).attr('class'),
           href: $(el).attr('href'),
           id: $(el).attr('id')
        });
    });
    console.log("Found links:", links.slice(0, 10));
    console.log("Forms:", $('form').length);
}).catch(console.error);
