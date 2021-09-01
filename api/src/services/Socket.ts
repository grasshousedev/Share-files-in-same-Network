import { Application, Request, Response } from "express";
import { Server, ServerOptions } from "socket.io";
import { Event } from "structures/Event";
import { Events } from "types/Events";
import { loadEvents } from "utils/loadEvents";
import { CLIENT_URL } from "utils/constants";

import DISCONNECT from "src/events/DISCONNECT";

const SOCKET_OPTIONS: Partial<ServerOptions> = {
  cors: {
    origin: CLIENT_URL,
  },
};

export class SocketService {
  private server: Application;
  private events: Map<string, Event> = new Map();
  io: Server;
  users: Map<string, any> = new Map();

  constructor(expressServer: Application) {
    const port = parseInt(process.env.API_PORT ?? "3030");
    this.server = expressServer;

    this.io = new Server(
      expressServer.listen(port, () => {
        console.log("Server & socket is running.");
      }),
      SOCKET_OPTIONS,
    );

    this.init();
  }

  async init() {
    this.events = await loadEvents(this);

    this.io.on("connection", (socket) => {
      socket.on("disconnect", () => new DISCONNECT(this).handle(socket));

      this.events.forEach((event) => {
        socket.on(event.name, (...args: any[]) => {
          event.handle(socket, ...args);
        });
      });
    });

    this.server.post("/upload", this.handleFileUpload.bind(this));
  }

  async handleFileUpload(req: Request, res: Response) {
    this.io.sockets.emit(Events.FILE_UPLOAD, { files: req.files });

    res.status(204).send();
  }
}
