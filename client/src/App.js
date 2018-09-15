import React, { Component } from "react";
import logo from "./wop.jpg";
import "./App.css";

const Colored = ({ value }) => {
  const colors = [
    "black",
    "red",
    "blue",
    "green",
    "yellow",
    "blue",
    "cyan",
    "magenta",
    "white"
  ];
  const currentValue = "";
  const colored = [];

  let i = 0;

  while (i < value.length) {
    let next = value.indexOf("^", i + 1);

    if (next === -1) next = value.length;

    if (value[i] !== "^") {
      colored.push(value.slice(0, next));
      i = next;
      continue;
    }

    const colorCode = parseInt(value[i + 1], 10);
    const text = value
      .slice(i + 2, next)
      .replace("\xa0", " ")
      .replace(String.fromCharCode(127), "")
      .trim();

    if (text)
      colored.push(
        <span key={colored.length} className={colors[colorCode]}>
          {text}
        </span>
      );

    i = next;
  }

  return colored;
};

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      serverInfo: []
    };

    this.gametypes = [
      "Free For All",
      "Tournament",
      "Single Player",
      "Team Deathmatch",
      "Last Pad Standing",
      "Spray your Color",
      "Capture the Lolly"
    ];
  }

  withoutColor(hostname) {
    return hostname.replace(/\^\d/g, "");
  }

  sortInfo(info) {
    return info.sort((a, b) => {
      const hostname1 = this.withoutColor(a.hostname);
      const hostname2 = this.withoutColor(b.hostname);
      return hostname1.localeCompare(hostname2);
    });
  }

  componentDidMount() {
    const socket = window.io(process.env.REACT_SERVER);
    socket.on("updated", data => {
      console.log(data);
      this.setState(state => ({
        serverInfo: this.sortInfo(data)
      }));
    });
  }

  getPlayers(server) {
    const infoStr = server.g_beryllium.split("\n").slice(1, -1);

    return infoStr.map(playerString => {
      const player = playerString.split(" ");

      if (playerString.includes("Ben")) console.log(playerString);

      return {
        name: player[2].slice(1, -1).trim(),
        frags: player[0],
        ping: player[1]
      };
    });
  }

  render() {
    return (
      <div className="app">
        <header className="header">
          <img src={logo} className="logo" alt="logo" />
          <h1 className="app-title">World of Padman - Server Status</h1>
        </header>
        {this.state.serverInfo.map(server => (
          <div className="row" key={server.hostname}>
            <div className="server-title">
              <h1>
                <Colored value={server.hostname} />
              </h1>
            </div>
            <div className="informations">
              <div className="server-info">
                <div className="info">
                  <span className="key">Current Map:</span>
                  <span className="value">{server.mapname}</span>
                </div>
                <div className="info">
                  <span className="key">Game type:</span>
                  <span className="value">
                    {this.gametypes[server.gametype]}
                  </span>
                </div>
                <div className="info">
                  <span className="key">Point limit:</span>
                  <span className="value">{server.pointlimit}</span>
                </div>
                <div className="info">
                  <span className="key">Time limit:</span>
                  <span className="value">{server.timelimit}</span>
                </div>
              </div>
              <div className="players-info">
                <div className="info title">
                  <div className="name">Player</div>
                  <div className="frags">Frags</div>
                  <div className="ping">Ping</div>
                </div>
                {this.getPlayers(server).map(player => (
                  <div className="info" key={player.name}>
                    <div className="name">
                      <Colored value={player.name} />
                    </div>
                    <div className="frags">{player.frags}</div>
                    <div className="ping">{player.ping}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
}

export default App;
