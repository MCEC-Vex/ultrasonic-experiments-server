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
            ws.send(JSON.stringify({
                type: 'capabilities',
                ...capabilities
            }));
        }
    
        ws.on('message', message =>
        {
            const data = JSON.parse(message);
            if(data.type === 'pollrate')
            {
                port.write(`poll,${data.sensor},${data.enabled},${data.interval},${data.offset}\n`);
            }
            console.log('Received: %s', message);
        });
        ws.on('close', () =>
        {
            console.log('Lost client!');
        });
    });
    
    let pingTime = null;
    const lineStream = port.pipe(new Readline({delimiter: '\r\n'}));
    lineStream.on('data', line =>
    {
        if(line.startsWith('capabilities,'))
        {
            const [hasMotor, ...offsets] = line.split(',').splice(1);
            capabilities = {
                hasMotor: hasMotor === '1',
                sensors: offsets.map(o => Number(o))
            };
            console.log('Capabilities:');
            console.log(capabilities);
        }
        else if(line === 'pong')
        {
            if(pingTime !== null)
            {
                console.log(`Got reply in ${Date.now() - pingTime}ms`);
            }
        }
        else if(line.startsWith('m,'))
        {
            const [sensor,microseconds] = line.split(',').splice(1).map(v => Number(v));
            wss.clients.forEach(client =>
            {
                client.send(JSON.stringify({
                    type: 'reading',
                    sensor,
                    data: microseconds
                }));
            });
        }
    });
    
    setTimeout(() =>
    {
        port.write('capabilities\n');
    }, 1000);
});
