const Master = require('../protocol');
const EventEmitter = require('events');

class ServerInfoCache extends EventEmitter {
    constructor(updateInterval) {
        super();

        this.serverInfo = [];
        this.updateInterval = updateInterval;
        this.master = new Master();

        this.update();
    }

    async getAllInfo(address, port) {
        const status = await this.master.getServerStatus(address, port);
        const info = await this.master.getServerInfo(address, port);
        return { ...status, ...info };
    }

    async update() {
        try {
            const servers = await this.master.getServers();

            const promises = servers.map(({ address, port }) =>
                this.getAllInfo(address, port)
            );

            this.serverInfo = await Promise.all(promises);

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
