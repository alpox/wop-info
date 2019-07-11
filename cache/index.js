const Master = require('../protocol');
const EventEmitter = require('events');

class ServerInfoCache extends EventEmitter {
    constructor(updateInterval) {
        super();

        this.serverInfo = [];
        this.updateInterval = updateInterval;
        this.master16 = new Master();
        this.master12 = new Master('master.worldofpadman.com', 68);

        this.update();
    }

    async requestServerInfo(master, address, port) {
        try {
            const status = await master.getServerStatus(address, port);
            const info = await master.getServerInfo(address, port);
            return { ...status, ...info, master: master.url };
        } catch(e) {
            console.error(`Server ${address}:${port} did not respond. Skipping server information for this server.`);
            return null;
        }
    }

    async getAllInfo(master) {
        const servers = await master.getServers();
        const allInfo = await Promise.all(servers.map(({ address, port }) =>
            this.requestServerInfo(master, address, port)
        ))

        // Remove server data with no response
        return allInfo.filter(info => info);
    }

    addVersion(version) {
        return async info => ({
            ...await info,
            version
        })
    }

    async update() {
        try {
            const info16 = (await this.getAllInfo(this.master16))
                .map(this.addVersion("1.6"));
            const info12 = (await this.getAllInfo(this.master12))
                .map(this.addVersion("1.2"));

            const allServerInfoPromises = [
                ...info16,
                ...info12
            ];

            this.serverInfo = await Promise.all(allServerInfoPromises);

            this.emit('updated', this.serverInfo);

            console.log('Updated and published');
        } catch (e) {
            console.log('Could not retrieve data:', e);
        }
    }

    startUpdating() {
        if (this.interval) return;
        this.interval = setInterval(
            this.update.bind(this),
            this.updateInterval
        );
    }

    stopUpdating() {
        clearInterval(this.interval);
        this.interval = null;
    }

    getServerInfo() {
        return this.serverInfo;
    }
}

module.exports = ServerInfoCache;
