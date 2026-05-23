const { Readable } = require('stream');

const stream = new Readable();
stream.push("hello world");
stream.push(null);

stream.on('data', chunk => console.log('Chunk:', chunk.toString()));
stream.on('end', () => console.log('End'));
