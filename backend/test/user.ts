// import { WebSocketGateway, WebSocketServer, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
// import { Injectable, Logger } from '@nestjs/common';
// import { LeaderboardService } from './leaderboard.service';
// import { Interval } from '@nestjs/schedule';
// import { OnEvent } from '@nestjs/event-emitter';
// import { Server } from 'ws';

// @WebSocketGateway({
//   path: '/leaderboard',
// })
// @Injectable()
// export class LeaderboardGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
//   private readonly logger = new Logger(LeaderboardGateway.name);
//   private clients: Set<any> = new Set();

//   @WebSocketServer()
//   server: Server;

//   constructor(private readonly leaderboardService: LeaderboardService) {
//     this.logger.log('LeaderboardGateway initialized with path: /leaderboard');
//   }

//   afterInit(server: Server) {
//     this.logger.log('Leaderboard WebSocket Gateway initialized at path: /leaderboard');
    
//     this.server.on('connection', (client: any, request: any) => {
//       this.clients.add(client);
//       const clientCount = this.clients.size;
//       const clientIp = request.socket.remoteAddress;
//       this.logger.log(`Client connected from ${clientIp}. Total clients: ${clientCount}`);
      
//       // Send initial data to newly connected client
//       this.sendLeaderboardData(client);
      
//       client.on('message', (message: any) => {
//         try {
//           const data = JSON.parse(message.toString());
//           if (data.type === 'getLeaderboard') {
//             this.sendLeaderboardData(client);
//           }
//         } catch (error) {
//           this.logger.error(`Error parsing message: ${error.message}`);
//         }
//       });
      
//       client.on('close', () => {
//         this.clients.delete(client);
//         this.logger.log(`Client disconnected. Total clients: ${this.clients.size}`);
//       });
      
//       client.on('error', (err: Error) => {
//         this.logger.error(`WebSocket error: ${err.message}`);
//         this.clients.delete(client);
//       });
//     });
//   }

//   handleConnection(client: any) {
//     // This is handled in the afterInit
//   }

//   handleDisconnect(client: any) {
//     // This is handled in the afterInit
//   }

//   // Listen for score submission events
//   @OnEvent('leaderboard.score.submitted')
//   handleScoreSubmitted(payload: any) {
//     this.logger.log(`Score submitted event: ${JSON.stringify(payload)}`);
//     this.notifyScoreSubmission(payload);
//   }

//   // Send initial leaderboard data to a newly connected client
//   private async sendLeaderboardData(client: any) {
//     try {
//       const topPlayers = await this.leaderboardService.getTopPlayers(10);
//       client.send(JSON.stringify({
//         type: 'leaderboard_update',
//         data: topPlayers,
//       }));
//     } catch (error) {
//       this.logger.error(`Error sending leaderboard data: ${error.message}`);
//     }
//   }

// //   // Broadcast leaderboard updates to all connected clients every 10 seconds
// //   @Interval(10000)
// //   async broadcastLeaderboardUpdates() {
// //     if (this.clients.size === 0) return;

// //     try {
// //       const topPlayers = await this.leaderboardService.getTopPlayers(10);
// //       this.broadcast({
// //         type: 'leaderboard_update',
// //         data: topPlayers,
// //       });
// //     } catch (error) {
// //       this.logger.error(`Error broadcasting leaderboard updates: ${error.message}`);
// //     }
// //   }

//   // Method to notify clients about a new score submission
//   async notifyScoreSubmission(data: any) {
//     if (this.clients.size === 0) return;

//     this.broadcast({
//       type: 'score_submission',
//       data,
//     });
//   }
  
//   // Broadcast a message to all connected clients
//   private broadcast(data: any) {
//     const message = JSON.stringify(data);
//     this.clients.forEach(client => {
//       if (client.readyState === 1) { // 1 = OPEN
//         client.send(message);
//       }
//     });
//   }
// } 