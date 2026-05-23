const fs = require('fs');
const html = fs.readFileSync('google_output.html', 'utf-8');
const match = html.match(/<a href[^>]*>/g);
console.log(match ? match.slice(0, 5) : "no match");
