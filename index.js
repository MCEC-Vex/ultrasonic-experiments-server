const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8090 });

function sendPacket(ws, data)
{
    ws.send(JSON.stringify(data));
}

wss.on('connection', (ws) =>
{
    console.log('Got new client!');
    
    sendPacket(ws, {
        type: 'capabilities',
        hasMotor: true,
        sensors: [0.0]
    });
    
    let readingInterval = setInterval(() =>
    {
        sendPacket(ws, {
            type: 'reading',
            sensor: 0,
            data: Math.floor((Math.random() * 100000))
        });
    }, 1000);
    
    ws.on('message', (message) =>
    {
        console.log('Received: %s', message);
    });
    ws.on('close', () =>
    {
        console.log('Lost client!');
        clearInterval(readingInterval);
    });
});
