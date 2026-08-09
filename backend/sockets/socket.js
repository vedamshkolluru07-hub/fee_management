// sockets/socket.js

module.exports = (io) => {

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // ======================================================
    // AUTO-JOIN USER ROOM FROM THE SESSION (SECURE)
    // ------------------------------------------------------
    // socket.request.session is populated by io.engine.use(sessionMiddleware)
    // in index.js. The same signed cookie the browser sends on normal HTTP
    // requests is sent on the socket handshake, so the user id here comes
    // from the server-verified session — never from something the client
    // typed or emitted. A user can only ever be joined to their own room,
    // so notifications can never be delivered to the wrong socket.
    // ======================================================
    const sessionUser = socket.request.session?.user;

    if (sessionUser?.user_id) {
      socket.join(`user_${sessionUser.user_id}`);
      console.log(`User ${sessionUser.user_id} joined room: user_${sessionUser.user_id}`);
    } else {
      console.log(`Socket ${socket.id} connected without an active session (not joined to a user room)`);
    }

    // ======================================================
    // OPTIONAL: GLOBAL MESSAGE TEST EVENT
    // ======================================================
    socket.on('sendMessage', (data) => {
      console.log('Message received:', data);
      io.emit('receiveMessage', data);
    });

    // ======================================================
    // DISCONNECT
    // ======================================================
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

};