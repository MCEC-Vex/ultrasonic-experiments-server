const WebSocket = require('ws');
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
const {argv} = require('yargs').option('port', {
    alias: 'p',
    type: 'string',
    description: 'The path of the serial port to use'
});

if(!argv.port)
{
    console.error('Missing port argument!');
    return;
}

const port = new SerialPort(argv.port, {
    baudRate: 115200
});
port.on('error', err =>
{
    console.log('Error: ', err.message);
});
port.on('open',() =>
{
    console.log('Port opened!');
    
    const wss = new WebSocket.Server({ port: 8090 });
    let capabilities = null;
    wss.on('connection', ws =>
    {
        console.log('Got websocket connection');
        if(capabilities !== null)
        {
            ws.send(JSON.stringify(capabilities));
        }
    
        ws.on('message', message =>
        {
            console.log('Received: %s', message);
        });
        ws.on('close', () =>
        {
            console.log('Lost client!');
        });
    });
    
    const lineStream = port.pipe(new Readline({delimiter: '\r\n'}));
    lineStream.on('data', line =>
    {
        console.log(`Got line: ${JSON.stringify(line)}`);
        if(line.startsWith('capabilities,'))
        {
            const [hasMotor, ...offsets] = line.split(',').splice(1);
            capabilities = {
                hasMotor: hasMotor === '1',
                sensors: offsets.map(o => Number(o))
            };
            console.log(capabilities);
        }
    });
    
    setTimeout(() =>
    {
        port.write('capabilities\n');
    }, 1000);
});
