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
        const status = await master.getServerStatus(address, port);
        const info = await master.getServerInfo(address, port);
        return { ...status, ...info, master: master.url };
    }

    async getAllInfo(master) {
        const servers = await master.getServers();
        return servers.map(({ address, port }) =>
            this.requestServerInfo(master, address, port)
        );
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
