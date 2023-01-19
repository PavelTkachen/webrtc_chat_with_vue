const fs = require('fs');
const os = require('os');
const readline = require('readline');

const readInterface = readline.createInterface({
input: fs.createReadStream('./servers.txt'),
console: false
});

let result = "[";

readInterface.on('line', function(line) {
result += JSON.stringify({ url: `${line}` }) + ',' + os.EOL;
});

readInterface.on('close', ()=>{
result = result.slice(0, result.length - 2);
result += os.EOL + "]"
console.log(result);
fs.writeFile("./result.txt", result, ()=>{
console.log('Done.');
})
})