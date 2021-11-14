export const HELP_CONTENT = 'Usage: \
p2pconnect [--help] [--version | -v] [--relay = <relay-address>] [--peer | -p = <recepient-username>] [--username | -u = <username>] \n\n\
Examples: \n\n\
Listen for connections: \n\
\tp2pconnect --username alice --relay 1.2.3.4:23232 \n\n\
Connect to a peer with username "bob": \n\
\tp2pconnect --peer bob --username alice --relay 1.2.3.4:23232\n';

export const PING_INTERVAL = 30000;