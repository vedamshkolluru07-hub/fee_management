import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';

import { environment } from '../../../../environments/environment.development';

export interface CalendarReminder {
  event_id: number;
  title: string;
  message: string;
  reminder_stage: number;
  start_time: string;
}

@Injectable({
  providedIn: 'root'
})
export class SocketService {

  private socket!: Socket;

  // Was hardcoded to 'http://localhost:5000' — now driven by environment
  // config so the same build works in dev and production.
  private readonly SOCKET_URL = environment.socketUrl;

  // Calendar reminder stream
  private reminderSubject = new Subject<CalendarReminder>();
  public reminder$ = this.reminderSubject.asObservable();

  constructor() {
    this.connect();
  }

  // ======================================================
  // CONNECT SOCKET
  // ------------------------------------------------------
  // withCredentials: true makes the browser send the "sid" session
  // cookie during the socket handshake. The backend reads that same
  // cookie (via io.engine.use(sessionMiddleware) in index.js) and
  // joins this socket to the correct `user_<id>` room automatically.
  // The client never needs to say who it is — there is no more
  // "join" emit with a user id.
  // ======================================================
  private connect(): void {
    this.socket = io(this.SOCKET_URL, {
      transports: ['websocket'],
      withCredentials: true,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket.id);
    });

    // ======================================================
    // RECEIVE CHAT MESSAGE (existing feature)
    // ======================================================
    this.socket.on('receiveMessage', (data: any) => {
      console.log('[Socket] Message received:', data);
    });

    // ======================================================
    // CALENDAR REMINDER (NEW FEATURE)
    // backend event: calendarReminder
    // ======================================================
    this.socket.on('calendarReminder', (data: CalendarReminder) => {
      console.log('[Socket] Calendar reminder:', data);
      this.reminderSubject.next(data);
    });

    this.socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
    });
  }

  // ======================================================
  // SEND MESSAGE (existing feature)
  // ======================================================
  sendMessage(message: any): void {
    this.socket.emit('sendMessage', message);
  }

  // ======================================================
  // OPTIONAL: GET MESSAGES AS OBSERVABLE
  // ======================================================
  onMessage(): Observable<any> {
    return new Observable(observer => {
      const handler = (data: any) => observer.next(data);

      this.socket.on('receiveMessage', handler);

      // cleanup when unsubscribed
      return () => {
        this.socket.off('receiveMessage', handler);
      };
    });
  }

  // ======================================================
  // DISCONNECT SOCKET
  // ======================================================
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}