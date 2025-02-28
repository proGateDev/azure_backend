const { Server } = require('socket.io'); // Correct import for socket.io server
const memberModel = require('../member/models/profile');
const userModel = require('../user/models/profile');
const trackingHistoryModel = require('../model/trackingHistory');
const chatModel = require('../model/chat');
const jwt = require('jsonwebtoken');
let io;

//------------------ Helpers function(s) -------------------------
const getConnectedMemberDetails = async (memberId) => {
  try {

    const user = await userModel
      .findById(memberId);
    if (user == null) {

      const member = await memberModel
        .findById(memberId).populate('parentUser')
      return member;
    }
    // console.log('details -------:', user, member);
    return user;
    // console.log('member details ---:', member);
  } catch (error) {
    console.error('Error fetching member details:', error);
    throw error;
  }
};
//----------------------------------------------------------------

const socketService = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*', // Adjust based on your needs
      methods: ['GET', 'POST'],
    },
    transports: ['websocket'], // Use websocket transport
  });
  const socketToMemberMap = {};

  io.on('connection', async (socket) => {





    console.log(" -------- Connectd !! -----------------", socket.connected, socket?.handshake?.auth?.userId);


    try {



      const token = socket?.handshake?.auth?.token;
      if (!token) {
        console.error('No token provided by client');
        socket.emit('error', { message: 'Authentication failed: No token provided' });
        socket.disconnect();
        return;
      }

      // Verify the token
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        console.error('Invalid token:', err.message);
        socket.emit('error', { message: 'Authentication failed: Invalid token' });
        socket.disconnect(); // Disconnect the client on token verification failure
        return;
      }

      const memberId = decoded?.userId;
      // console.error('memberId  --------',decoded );
      if (!memberId) {
        console.error('Invalid token: No userId present');
        socket.emit('error', { message: 'Authentication failed: Invalid token structure' });
        socket.disconnect();
        return;
      }

      const member = await getConnectedMemberDetails(memberId);
      // socket.on('data', (d) => {
      //   console.log('From client -----:', d, member.role);
      // });
      if (!member) {
        console.error(`Member with ID ${memberId} not found`);
        socket.emit('error', { message: 'Authentication failed: Member not found' });
        socket.disconnect();
        return;
      }
      socketToMemberMap[socket.id] = {
        socketId: socket.id,
        clientId: member?.id,
        // clientId: '672d97288a90cb779e57730e',
        clientType: member.role,
      };

      if (member.role === 'user') {
        socket.emit(`user_${memberId}`, { type: 'user' });
      } else if (member.role === 'member') {

        let liveMemberData = {
          id: member?.id,
          name: member?.name,
          role: member?.role,
        }

        // socket.join(`rohit`);
        console.log(`Sending .... `);
        console.log(` member: ${liveMemberData.name} ; parent: ${member?.parentUser.name},`);
        io.emit(`user_${member?.parentUser?._id}`, liveMemberData); // Broadcast to all connected clients
      }


      // console.log(`----------------------> :user_${member.role}`);
      // user_66f673eaa447d313a6747f9a
      // socket.emit(`user_66f673eaa447d313a6747f9a`, { data: socketToMemberMap[socket.id] });
      socket.emit(`member_674d4fd79c5285f0c99b0062`, { data: socketToMemberMap[socket.id] });
      // socket.emit(`user_${member?.parentUser._id}`, { data: socketToMemberMap[socket.id] });

      // socket.on('disconnect', () => {
      //   console.log(`Disconnected ⛔ for  ${memberId}, ${member.name} `);
      //   io.emit('disconnectMembers', { data:memberId });

      //   delete socketToMemberMap[socket.id];
      // });


      // ============ Custom Socket f(x) ================================================



      //==================================================================================================



      socket.on('disconnect', () => {
        console.log(`Disconnected ⛔ for  ${memberId}, ${member.name} `);
        io.emit('disconnectedMembers', {

          id: memberId,
          name: member?.name
        })

        // delete socketToMemberMap[socket.id];
      });

      socket.on('SOS', (data) => {
        console.log('SOS To ____', `SOS_member_${data?.memberId} _____`);

        io.emit(`SOS_member_${data?.memberId}`, {
          message: data.message,
          memberId: data.memberId,
          

        })

      });

      // io.emit('myCustomEvent', { data: socketToMemberMap });
    } catch (error) {
      console.error('Error during connection handling:', error.message);
      socket.emit('error', { message: 'Internal server error' });
      socket.disconnect();
    }
  });






};




const sendNotification = (userId, notification) => {
  if (io) {
    console.log('============  SOCKET  ------------>', userId)
    io.to(userId).emit('notification', notification);
    // io.to(userId).emit('notification', notification);
  }
};


const sendServerDetailToClient = (data) => {
  if (io) {
    console.log('============  sendServerDetailToClient  ------------>', data)
    io.emit('getUserId', data);
  }
};



const updateLocation = (data) => {
  if (io) {
    console.log('============  updateLocation  ------------>', data)
    io.emit('locationUpdate', '------- current location : ');
  }
};



const onMemberVerified = (message) => {
  if (io) {
    console.log('============  onMemberVerified chala    ................')
    io.emit('onMemberVerified', message);
  }
};
//--------------- Chat sockets ----------------------------------------
const onUserJoined = (roomId, user) => {
  if (io) {
    console.log(`User ${user.username} joined room ${roomId}`);
    io.to(roomId).emit("onUserJoined", { roomId, user });
  }
};


//==================================================================
module.exports = {
  socketService,
  sendNotification,
  sendServerDetailToClient,
  updateLocation,
  onMemberVerified,
  onUserJoined,
  // sendUserMemberChatHistory,
};
